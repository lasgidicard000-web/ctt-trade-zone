# Field Marshal Premium Dashboard — $500 Upgrade Deposit Gate

## What we're building

A $500 BTC upgrade deposit that unlocks the premium dashboard for Field Marshal plan members:

- **Login page (public):** A notice card under the sign-in/sign-up box — "Field Marshal Plan — Premium Dashboard Access" — stating that a $500 upgrade deposit is required to access the premium dashboard, showing the BTC deposit address (bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk) with a copy button and QR code.
- **Member side:** Field Marshal plan members who haven't completed the $500 upgrade see their premium dashboard section locked — a "Premium dashboard locked — complete your $500 upgrade deposit" card with the address, QR, and a "I've sent the deposit" button that creates a pending request.
- **Admin side:** Pending upgrade requests appear in the admin desk; confirming marks the member's upgrade paid (and credits the deposit like a manual deposit), declining marks it rejected.

No one is charged automatically — payment happens by BTC deposit to the displayed address, and only admin confirmation unlocks the premium dashboard.

## Database changes (one migration)

New table `public.field_marshal_upgrades`:

- `id uuid` PK, `user_id uuid` (plain UUID, no FK to auth), `amount_usd numeric NOT NULL DEFAULT 500`
- `status text NOT NULL DEFAULT 'pending'` with CHECK in ('pending','confirmed','rejected')
- `btc_amount numeric`, `note text`, `confirmed_at timestamptz`, `confirmed_by uuid`, `created_at timestamptz DEFAULT now()`
- Unique partial index: one pending/confirmed row per user (rejected members can re-request)

RLS + grants in the same migration:

- Owner can SELECT own rows; INSERT own row only while none is pending/confirmed
- Admin (via `has_role`) SELECT/UPDATE all
- `GRANT ... TO authenticated; GRANT ALL ... TO service_role;` per project rules

Security-definer helper `public.has_field_marshal_upgrade(_user_id uuid) returns boolean` — true when a confirmed row exists — used by the client through a small RPC or direct select.

## Frontend changes

1. **`src/pages/Auth.tsx`** — add a public notice card below the sign-in card:
   - Title "Field Marshal Plan — Premium Dashboard Access"
   - Text: a one-time $500 upgrade deposit is required to access the premium dashboard reserved for Field Marshal plan members
   - BTC address with copy button + QR code (same `qrcode` package already used on Wallet)
   - Button linking to sign-up ("Open a Field Marshal account")

2. **`src/hooks/useFieldMarshalUpgrade.ts`** (new) — detects Field Marshal membership (same check as the existing Field Marshal banner: active `field` plan / template name contains "field marshal") and the upgrade record state (none / pending / confirmed), subscribing to realtime changes.

3. **`src/components/PremiumAccessGate.tsx`** (new) — wraps the Field Marshal premium section (where `FieldMarshalPayoutCard` renders on the Wallet page):
   - **Confirmed:** renders the premium content as today
   - **Pending:** locked card — "Upgrade deposit under review" with the submitted amount and time
   - **Not paid:** locked card — "$500 upgrade deposit required" with BTC address, QR, copy button, and "I've sent the deposit" (creates the pending request; toast confirms it's awaiting admin approval)

4. **Admin desk** — extend the admin section with a "Field Marshal Upgrades" list (pending requests with member, amount, note; Confirm / Decline). Confirming marks the record confirmed, records a completed deposit in the member's history (deposit history + transaction + admin audit log, matching the existing manual-deposit pattern), and unlocks their premium dashboard. Declining marks it rejected with a note, letting the member re-request.

## Copy rules

- The notice always says the $500 is an upgrade deposit to unlock the premium dashboard — never a fee taken automatically, and never a guaranteed-return promise.
- Existing wallet activation ($200) is unchanged and described separately; this is an additional, clearly-labelled Field Marshal upgrade.

## Verification

- `bunx tsgo --noEmit`
- Playwright: login page shows the notice with the address and QR; signed-in Field Marshal member without an upgrade sees the locked premium section; after admin confirmation it unlocks
- Preview sign-in as Jeremy (Field Marshal member) to see the locked state end-to-end
