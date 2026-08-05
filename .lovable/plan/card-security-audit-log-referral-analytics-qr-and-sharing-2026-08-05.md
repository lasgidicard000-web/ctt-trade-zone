# Card security audit log + referral analytics, QR and sharing

## 1. Card security audit log

Every sensitive action on the CTT card gets recorded and shown to the owner:

- PIN unlock attempts (success and failure, including lockouts)
- Card number / expiry / CVV reveal
- Copy card number
- Auto-hide when the 60-second window expires, and manual "Hide now"

A new **Card security activity** section under the card lists the most recent events with action name, time, and device/browser hint. Admins can see the same events per card in the admin Cards tab.

## 2. Referral analytics on every dashboard

The referral card gains a live stats row:

- **Link clicks** — counted when someone opens `/auth?ref=<id>`
- **Signups** — completed referrals attributed to the link
- **Rewards** — total earned plus pending vs paid status

Below the stats, a compact list of recent referral events (click, signup, reward paid) with dates. Zero-state copy encourages sharing when there is no activity yet.

## 3. Referral QR code + one-tap share

- A scannable QR code for the referral link rendered next to the link, with a **Download QR** button (PNG).
- One-tap share buttons per platform (WhatsApp, Telegram, X, Facebook, Email, SMS, native share) that open the prefilled message directly and confirm with a toast.

## 4. Copy + unlock countdown feedback

- Copying the card number shows an inline on-card confirmation ("Card number copied") in addition to the toast, auto-clearing after a few seconds.
- The unlock countdown is shown as a visible timer with a progress indicator; when it reaches zero the fields re-mask and a persistent **Unlock again** button stays in place until used.

## Technical notes

- Migration: `card_security_events` table (`user_id`, `card_id`, `action`, `success`, `detail`, `user_agent`, `created_at`) with GRANTs, RLS (owner read, admin read, owner insert scoped to own cards), plus a `log_card_event(_card_id, _action, _success, _detail)` security-definer function. `get_card_details` also logs unlock success/failure/lockout server-side.
- Migration: `referral_clicks` table (`referrer_id`, `referral_code`, `created_at`, coarse `source`) with anon insert allowed via a security-definer `record_referral_click(_ref text)` function (no PII stored), owner/admin read. Plus `get_referral_stats()` returning clicks, signups, rewards total and pending count for `auth.uid()`.
- `src/pages/Auth.tsx`: on mount, if `?ref=` present, call `record_referral_click` once per session.
- `src/hooks/useReferralStats.ts`: fetch stats + recent events.
- `src/components/ReferralLinkCard.tsx`: add QR (existing `qrcode` package) with download, stats row, recent events list, per-platform one-tap share with toast.
- `src/hooks/useVirtualCard.ts`: `logEvent()` helper; call on reveal, copy, hide, auto-hide.
- `src/components/CttDebitCard.tsx`: inline copy confirmation, countdown progress, persistent "Unlock again" button after expiry.
- New `src/components/card/CardSecurityLog.tsx` for the event list; reuse it in `src/components/admin/AdminCards.tsx`.
