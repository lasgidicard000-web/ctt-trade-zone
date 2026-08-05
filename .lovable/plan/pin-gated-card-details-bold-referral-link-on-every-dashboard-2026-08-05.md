# PIN-gated card details + bold referral link on every dashboard

## 1. PIN gate for CVV / expiry / card number

Today the card face shows the expiry and CVV permanently, and the details are fetched with no PIN check (`get_card_details` only verifies ownership).

New behaviour on the CTT card:

- CVV and full card number are masked by default (`•••`, `•••• •••• •••• 4821`); expiry shows as `••/••` until unlocked.
- Tapping **View sensitive details** opens a 4-digit PIN dialog. Correct PIN reveals card number, expiry and CVV together.
- Revealed values auto-hide after 60 seconds, with a visible countdown next to the reveal button, plus a **Hide now** action.
- Wrong PIN shows an inline error; 5 wrong attempts in a row locks reveals for 15 minutes (message tells the user when they can retry).
- If no PIN is set yet, the reveal button prompts the user to set one first (existing PIN dialog).
- Copy number also goes through the same unlock (no copying while locked).

## 2. Bold referral link on every user dashboard

- The referral card now shows a full shareable **link** (`https://<site>/auth?ref=<user id>`), not just a raw code, rendered large and bold with a highlighted panel so it is the first thing users notice in the rewards area.
- One-tap **Copy link** button with confirmation feedback.
- Share row for all platforms: WhatsApp, Telegram, X, Facebook, Email, SMS, plus native device share (Web Share API) where available, each pre-filled with an invite message and the link.
- Existing referral code input/apply flow, counters and milestones stay untouched.
- The referral block is promoted so it renders near the top of the wallet dashboard as well as inside the rewards section.

## Technical notes

- Migration: replace `get_card_details(_card_id)` with `get_card_details(_card_id uuid, _pin text)` — verifies `pin_hash` via `extensions.crypt`, raises `invalid pin` on mismatch, and records failed attempts in a new `card_reveal_attempts` table (RLS: owner select, function-managed writes; GRANTs for `authenticated` and `service_role`) used for the 5-attempt lockout.
- `src/hooks/useVirtualCard.ts`: `reveal(pin)` passes the PIN; returns typed error codes (`no_pin`, `invalid_pin`, `locked`).
- New `src/components/card/CardRevealDialog.tsx`: PIN entry, error states, lockout message.
- `src/components/CttDebitCard.tsx`: drop the mount-time `reveal()` call, mask expiry/CVV, add reveal countdown timer state (60s) that clears details, gate copy behind unlock.
- New `src/components/ReferralLinkCard.tsx`: bold link display, copy, share targets; used by `RewardsSection.tsx` and rendered on `src/pages/Wallet.tsx`.
- No changes to spend, freeze, limits, transactions or admin card tooling.
