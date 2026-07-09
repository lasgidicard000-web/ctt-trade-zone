# Admin Transactions Management

Add a new **Transactions** tab inside the existing Admin page that unifies management of every money-movement record, plus a manual balance-adjustment tool. ROI regulation and user editing already exist elsewhere in admin and are not duplicated here.

## What the admin can do

For every row (deposit, withdrawal, internal transaction, manual adjustment):
- Approve / Reject / Cancel with a reason field
- Edit amount, transaction hash, and notes
- Delete or reverse — reversal atomically refunds/debits the user's wallet balance
- Filter by user, type, status, coin, and date range
- Export the filtered view to CSV

Plus a **Manual balance adjustment** panel: pick user + coin + direction + amount + reason; writes a `transactions` row of type `admin_adjustment` and updates `wallet_balances` atomically.

## UI

`src/pages/Admin.tsx` gets a new **Transactions** tab rendering `AdminTransactions`:

```text
[ Filters: type | status | coin | user | date range | export CSV ]
[ Sub-tabs: All | Deposits | Withdrawals | Internal | Adjustments ]
[ Table: date | user | type | coin | amount | status | hash | actions ]
[ Row actions: View | Edit | Approve | Reject | Reverse | Delete ]
[ Manual adjustment card (collapsible) ]
```

## Backend

One edge function **`admin-transactions`** behind a `has_role(admin)` gate handles all mutations. Client reads go through PostgREST using existing admin RLS.

POST actions `{ action, ...payload }`:
- `edit` — update amount / hash / notes
- `set-status` — approve/reject/cancel with reason; refunds balance for reject/cancel on withdrawals
- `reverse` — undo a completed transaction and reverse the wallet impact
- `delete` — hard delete + balance reversal in one call
- `adjust-balance` — credit/debit `wallet_balances` and log a matching `transactions` row

All mutations call a new `SECURITY DEFINER` SQL function `public.admin_apply_transaction_action(_admin_id, _action, _payload jsonb)` so wallet + status changes happen in one DB transaction and every call appends to a new **`admin_transaction_log`** table (`admin_user_id, action, target_table, target_id, before jsonb, after jsonb, reason, created_at`).

## Migration

1. `CREATE TABLE public.admin_transaction_log` + GRANTs (`service_role` all, `authenticated` select via admin-only RLS).
2. `CREATE FUNCTION public.admin_apply_transaction_action(...)` — validates `has_role`, dispatches by action, mutates target row + `wallet_balances`, appends to the log.
3. `GRANT EXECUTE ... TO service_role` only (same pattern as `regulate_daily_roi`).

`transactions.type` and `.status` are free-text today, so `admin_adjustment` and `reversed` need no schema change.

## Files touched

- **New:** `src/pages/AdminTransactions.tsx`
- **New:** `src/components/admin/ManualBalanceAdjustment.tsx`
- **New:** `src/components/admin/TransactionRowActions.tsx`
- **New:** `supabase/functions/admin-transactions/index.ts` (Zod, CORS, JWT + admin check)
- **New migration:** `admin_transaction_log` + `admin_apply_transaction_action`
- **Edited:** `src/pages/Admin.tsx` — add the Transactions tab

## Out of scope

- ROI regulation (already in `RoiRegulator`)
- User role editing (already in `AdminUserManagement`)
- Bulk multi-select and scheduled rules

Confirm and I'll build it.
