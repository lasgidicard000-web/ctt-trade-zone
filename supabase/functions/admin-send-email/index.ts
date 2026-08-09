import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const BodySchema = z.object({
  recipientEmail: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  heading: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(8000),
  buttonLabel: z.string().trim().max(60).optional(),
  buttonUrl: z.string().trim().url().max(500).optional(),
  recipientName: z.string().trim().max(100).optional(),
  threadId: z.string().uuid().optional(),
  appOrigin: z.string().trim().url().max(200).optional(),
})

const DEFAULT_ORIGIN = 'https://ctttradezone.com'

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const callerId = claimsData.claims.sub as string

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: isAdminRow } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()

    if (!isAdminRow) {
      return json({ error: 'Forbidden' }, 403)
    }

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    // One recipient per send — reject arrays or comma-separated lists.
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).recipientEmail)) {
      return json({ error: 'Only one recipient per send is allowed' }, 400)
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400)
    }

    const input = parsed.data
    if (input.recipientEmail.includes(',') || input.recipientEmail.includes(';')) {
      return json({ error: 'Only one recipient per send is allowed' }, 400)
    }

    const recipient = input.recipientEmail.toLowerCase()

    const { data: suppressed } = await admin
      .from('suppressed_emails')
      .select('reason')
      .eq('email', recipient)
      .maybeSingle()

    if (suppressed) {
      return json(
        {
          error: `This address is on the suppression list (${suppressed.reason}) and cannot be emailed.`,
        },
        400
      )
    }

    // --- Thread: continue an existing conversation or start a new one ---
    let threadId = input.threadId ?? null
    if (threadId) {
      const { data: existing } = await admin
        .from('mail_threads')
        .select('id')
        .eq('id', threadId)
        .maybeSingle()
      if (!existing) threadId = null
    }
    if (!threadId) {
      const { data: created, error: threadErr } = await admin
        .from('mail_threads')
        .insert({
          subject: input.subject,
          participant_email: recipient,
          participant_name: input.recipientName ?? null,
          created_by: callerId,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (threadErr) {
        console.error('thread create failed', threadErr.message)
        return json({ error: 'Could not create the conversation' }, 500)
      }
      threadId = created.id
    }

    const idempotencyKey = `admin-message-${crypto.randomUUID()}`

    const { data: messageRow } = await admin
      .from('mail_messages')
      .insert({
        thread_id: threadId,
        direction: 'outbound',
        sender_email: null,
        heading: input.heading ?? null,
        body: input.body,
        button_label: input.buttonLabel ?? null,
        button_url: input.buttonUrl ?? null,
        message_id: idempotencyKey,
        created_by: callerId,
      })
      .select('id')
      .single()

    // Mint a single-conversation reply token for the in-app reply page.
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const replyToken = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    await admin.from('mail_reply_tokens').insert({
      token: replyToken,
      thread_id: threadId,
      message_id: messageRow?.id ?? null,
      recipient_email: recipient,
    })

    const origin = (input.appOrigin ?? DEFAULT_ORIGIN).replace(/\/$/, '')
    const replyUrl = `${origin}/reply/${replyToken}`

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: 'admin-message',
        recipientEmail: recipient,
        idempotencyKey,
        templateData: {
          subject: input.subject,
          heading: input.heading || input.subject,
          body: input.body,
          buttonLabel: input.buttonLabel,
          buttonUrl: input.buttonUrl,
          recipientName: input.recipientName,
          replyUrl,
        },
      }),
    })

    const sendJson = await sendRes.json().catch(() => ({}))
    if (!sendRes.ok) {
      console.error('send-transactional-email failed', sendJson)
      return json({ error: (sendJson as any).error ?? 'Failed to send email' }, 502)
    }

    await admin
      .from('mail_threads')
      .update({ last_message_at: new Date().toISOString(), subject: input.subject })
      .eq('id', threadId)

    await admin.from('admin_transaction_log').insert({
      admin_user_id: callerId,
      action: 'send-email',
      target_table: 'email_send_log',
      after: {
        recipient,
        subject: input.subject,
        idempotency_key: idempotencyKey,
        thread_id: threadId,
      },
      reason: 'manual webmail send',
    })

    return json({ success: true, threadId, ...sendJson })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    console.error('admin-send-email error', message)
    return json({ error: message }, 500)
  }
})
