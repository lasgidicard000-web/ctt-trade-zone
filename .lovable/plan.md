## Plan: Admin Gift Card Redemptions Page

### Goal
A new admin-only page at `/admin/redemptions` to view and process all gift card redemption submissions from users.

### Context
- `redemptions` table already exists with: `gift_card_code`, `gift_card_type`, `gift_card_currency`, `crypto_symbol`, `amount`, `wallet_address`, `email`, `screenshot_url`, `status`, `user_id`, timestamps.
- RLS already allows admins to view and update all redemptions.
- Redemption flow uses Tawk.to + clipboard (no file uploads), but the submitted form data is persisted in this table — those are the "submitted documents" admins need to see.

### Page (`src/pages/AdminRedemptions.tsx`)
- Admin guard: check `has_role(user.id, 'admin')`; redirect to `/` if not admin.
- Summary cards: Total submissions, Pending, Approved, Rejected.
- Filters: status dropdown (all/pending/approved/rejected), search by gift card code / email / wallet address, gift card type filter.
- Table columns: Date, User (display_name), Gift Card Type, Currency, Code (masked, click to reveal/copy), Amount, Payout Crypto, Wallet Address (copy), Email, Status badge, Actions.
- Row click → details Dialog with full unmasked code, screenshot (if `screenshot_url` present), and Approve / Reject / Mark Paid buttons with optional admin note.
- Status updates write back to `redemptions.status` (and `updated_at`).
- CSV export of current filtered view.
- Profiles fetched once and joined client-side for display_name (no FK exists).

### Wiring
- Add route `/admin/redemptions` in `src/App.tsx`.
- Add "Gift Card Redemptions" entry card/link on `src/pages/Admin.tsx` next to existing admin sections (Users, Deposits, Withdrawals).

### Out of Scope
- No DB schema changes (existing columns and RLS cover it).
- No new storage bucket; existing `gift-card-screenshots` bucket is used only if a `screenshot_url` is present.
- No edits to the user-facing Redeem flow.

### Files
- **New:** `src/pages/AdminRedemptions.tsx`
- **Edited:** `src/App.tsx`, `src/pages/Admin.tsx`
