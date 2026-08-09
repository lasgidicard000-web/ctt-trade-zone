# Webmail: Inbox, Outbox and Drafts

Turn the admin Webmail page into a real mailbox with three folders, and let users reply from inside the app so their replies land in your Inbox as threaded conversations.

## Folders

The Webmail page gets four tabs:

- **Compose** — as today (recipient, subject, heading, body, optional button, live branded preview).
- **Inbox** — replies received from users. Unread ones are highlighted with a count badge on the tab. Opening a message shows the full conversation and a reply box that sends another branded email in the same thread.
- **Outbox** — every email you sent, one row per email, with recipient, subject, delivery status badge (sent / pending / failed / suppressed) and timestamp. Replaces the current "Sent mail" tab and links each row to its thread.
- **Drafts** — save a composed message at any time and reopen it later to edit, discard, or send. Autosaves while typing.

## How replies reach the Inbox

Every email you send includes a "Reply to this message" button linking to a secure reply page in the app (`/reply/:token`). The recipient opens it, sees the original message, types a reply, and submits — no login required, and the link only works for that one conversation. The reply is stored and appears immediately in your Inbox, attached to the original message's thread. You can reply back from the thread, which sends a new branded email carrying a fresh reply link.

Replies sent to the sending address itself cannot be received (the mail service is send-only), so the in-app reply link is the reply channel; the emails make that clear.

## Threading

Each sent email opens a thread. Every later reply — from you or the user — is appended to it, newest last, with sender labels and timestamps. Inbox and Outbox rows both open the same thread view.

## Technical notes

- New tables (all admin-read via `has_role`, service-role write from edge functions):
  - `mail_threads` — subject, participant email/name, last_message_at, unread_count, status.
  - `mail_messages` — thread_id, direction (`outbound` / `inbound`), body, heading, button label/url, `email_send_log.message_id` for outbound delivery status, created_at.
  - `mail_drafts` — owned by the admin who created it (`auth.uid()`), recipient, subject, heading, body, button fields, updated_at.
  - `mail_reply_tokens` — random token, thread_id, expires_at, revoked flag; consumed by the public reply endpoint.
  All get GRANTs, RLS and `updated_at` triggers per project convention.
- `admin-send-email` extended to: create or continue a thread, record the outbound `mail_messages` row, mint a reply token, and pass `replyUrl` into `templateData`.
- `admin-message.tsx` template gains an optional "Reply to this message" secondary button rendered from `replyUrl`; template registry unchanged otherwise, functions redeployed after edits.
- New edge function `mail-reply` (`verify_jwt = false`): Zod-validated `{ token, body }`, validates/expiry-checks the token, rate-limits per token, inserts the inbound `mail_messages` row and bumps thread `unread_count` / `last_message_at`. No email is sent outbound from a user reply.
- New page `src/pages/ReplyToMessage.tsx` at `/reply/:token` — branded, shows the original message, textarea (max 5000 chars), success / expired / invalid states.
- `src/pages/AdminWebmail.tsx` split into `src/components/webmail/` components: `Composer`, `InboxList`, `OutboxList`, `DraftsList`, `ThreadView`. Outbox keeps the existing `email_send_log` dedupe-by-`message_id` logic for status.
- Realtime subscription on `mail_messages` so new replies appear without refreshing.
