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
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // One recipient per send — reject arrays or comma-separated lists.
    if (raw && typeof raw === 'object' && Array.isArray((raw as any).recipientEmail)) {
      return new Response(
        JSON.stringify({ error: 'Only one recipient per send is allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const input = parsed.data
    if (input.recipientEmail.includes(',') || input.recipientEmail.includes(';')) {
      return new Response(
        JSON.stringify({ error: 'Only one recipient per send is allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const recipient = input.recipientEmail.toLowerCase()

    const { data: suppressed } = await admin
      .from('suppressed_emails')
      .select('reason')
      .eq('email', recipient)
      .maybeSingle()

    if (suppressed) {
      return new Response(
        JSON.stringify({
          error: `This address is on the suppression list (${suppressed.reason}) and cannot be emailed.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const idempotencyKey = `admin-message-${crypto.randomUUID()}`

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
        },
      }),
    })

    const sendJson = await sendRes.json().catch(() => ({}))
    if (!sendRes.ok) {
      console.error('send-transactional-email failed', sendJson)
      return new Response(
        JSON.stringify({ error: (sendJson as any).error ?? 'Failed to send email' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await admin.from('admin_transaction_log').insert({
      admin_user_id: callerId,
      action: 'send-email',
      target_table: 'email_send_log',
      after: { recipient, subject: input.subject, idempotency_key: idempotencyKey },
      reason: 'manual webmail send',
    })

    return new Response(JSON.stringify({ success: true, ...sendJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    console.error('admin-send-email error', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
