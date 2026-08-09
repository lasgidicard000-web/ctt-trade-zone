import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'

const ReplySchema = z.object({
  token: z.string().trim().min(20).max(120),
  body: z.string().trim().min(1).max(5000),
})

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // GET: validate the token and return the conversation so the reply page can render it.
    if (req.method === 'GET') {
      const token = new URL(req.url).searchParams.get('token')?.trim() ?? ''
      if (token.length < 20 || token.length > 120) {
        return json({ status: 'invalid' }, 200)
      }

      const { data: tok } = await admin
        .from('mail_reply_tokens')
        .select('id, thread_id, recipient_email, expires_at, revoked')
        .eq('token', token)
        .maybeSingle()

      if (!tok) return json({ status: 'invalid' })
      if (tok.revoked) return json({ status: 'revoked' })
      if (new Date(tok.expires_at) < new Date()) return json({ status: 'expired' })

      const { data: thread } = await admin
        .from('mail_threads')
        .select('id, subject, participant_name')
        .eq('id', tok.thread_id)
        .maybeSingle()

      const { data: messages } = await admin
        .from('mail_messages')
        .select('id, direction, heading, body, created_at')
        .eq('thread_id', tok.thread_id)
        .order('created_at', { ascending: true })
        .limit(50)

      return json({
        status: 'ok',
        subject: thread?.subject ?? '',
        recipientName: thread?.participant_name ?? null,
        messages: messages ?? [],
      })
    }

    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405)
    }

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const parsed = ReplySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400)
    }

    const { token, body } = parsed.data

    const { data: tok } = await admin
      .from('mail_reply_tokens')
      .select('id, thread_id, recipient_email, expires_at, revoked, use_count, last_used_at')
      .eq('token', token)
      .maybeSingle()

    if (!tok) return json({ error: 'This reply link is not valid.' }, 400)
    if (tok.revoked) return json({ error: 'This reply link is no longer active.' }, 400)
    if (new Date(tok.expires_at) < new Date()) {
      return json({ error: 'This reply link has expired.' }, 400)
    }

    // Simple per-token rate limit: at most one reply every 20 seconds, 20 in total.
    if (tok.last_used_at && Date.now() - new Date(tok.last_used_at).getTime() < 20_000) {
      return json({ error: 'Please wait a moment before sending another reply.' }, 429)
    }
    if (tok.use_count >= 20) {
      return json({ error: 'Reply limit reached for this conversation.' }, 429)
    }

    const { data: thread } = await admin
      .from('mail_threads')
      .select('id, participant_name, unread_count')
      .eq('id', tok.thread_id)
      .maybeSingle()

    const { error: insertErr } = await admin.from('mail_messages').insert({
      thread_id: tok.thread_id,
      direction: 'inbound',
      sender_email: tok.recipient_email,
      sender_name: thread?.participant_name ?? null,
      body,
    })
    if (insertErr) {
      console.error('mail-reply insert failed', insertErr.message)
      return json({ error: 'Could not save your reply. Please try again.' }, 500)
    }

    await admin
      .from('mail_threads')
      .update({
        unread_count: (thread?.unread_count ?? 0) + 1,
        last_message_at: new Date().toISOString(),
        status: 'open',
      })
      .eq('id', tok.thread_id)

    await admin
      .from('mail_reply_tokens')
      .update({ use_count: tok.use_count + 1, last_used_at: new Date().toISOString() })
      .eq('id', tok.id)

    return json({ success: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error'
    console.error('mail-reply error', message)
    return json({ error: 'Server error' }, 500)
  }
})
