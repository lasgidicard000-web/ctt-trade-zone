# Admin Webmail — send emails to users manually

A private, admin-only mail composer inside the app so you can write and send an email to a specific user from your own `@ctttradezone.com` sender, and see whether it was delivered.

## What you get

1. **New admin page: Webmail** (`/admin/webmail`, linked in the admin navigation, admin role required)
   - **Compose panel**: recipient (pick a registered user from a searchable list, or type any address), subject, and a message body with basic formatting (paragraphs, bold, links).
   - **Templates**: a couple of ready-made starting points (account notice, deposit/withdrawal update, support reply) that pre-fill subject and body; fully editable before sending.
   - **Live preview**: shows the branded CTTTradezone email (indigo/navy header, logo, footer) exactly as the user will receive it.
   - **Send**: one recipient per send, with a confirmation step showing the final recipient and subject.
2. **Sent mail log**: table of past sends with recipient, subject, status badge (sent / pending / failed / suppressed), timestamp, and error detail when a send fails. Deduplicated so each email appears once.
3. **Safety rails**: suppressed/bounced addresses are blocked automatically with a clear message; the composer sends to one recipient at a time (no lists, no bulk campaigns — Lovable's email service is for account/transactional mail only, not newsletters or promotions).

## Email look

Reuses the existing branded auth-email styling: white body, navy header band with the CTTTradezone mark, 16px readable body text, indigo call-to-action button when a link is included, and mobile-tested spacing.

## Technical notes

- Email sending infrastructure for `notify.ctttradezone.com` (queue, send log, suppression list) already exists; this adds the app-email sending layer on top of it via the standard scaffolding, then a generic `admin-message` template that accepts a subject, heading, body paragraphs, and optional button label/URL.
- New edge function `admin-send-email`: validates the caller's JWT, checks the `admin` role server-side, validates input with Zod (recipient email, subject length, body length), checks `suppressed_emails`, then invokes the shared send function with an idempotency key. Rejects arrays of recipients.
- Frontend: `src/pages/AdminWebmail.tsx` plus small components for the composer, preview, and sent log; route added in `App.tsx` and an "Webmail" link in the admin section of `Navbar.tsx`.
- Sent log reads `email_send_log`, deduplicated by `message_id` taking the latest status per email; admin-only access enforced server-side.
- Templates and functions are deployed after the changes so the new sender is live.

## Note

Emails only leave the queue once DNS verification for `notify.ctttradezone.com` finishes. Until then, sends are accepted and queued, and the log will show them as pending.
