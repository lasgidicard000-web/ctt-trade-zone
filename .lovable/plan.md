## Goal

Add an **Audit** tab inside `src/pages/AdminTransactions.tsx` that lists every manual wallet adjustment (`admin_transaction_log` where `action = 'adjust-balance'`) with the target user's BTC and USDT balance **before** and **after** the change, plus the reason.

## Current state (verified)

- `admin_transaction_log` already captures every `adjust-balance` call with `admin_user_id`, `target_user_id`, `before`, `after`, `reason`, `created_at`.
- Today the log's `before` is only `{balance}` (of the adjusted coin) and `after` is `{balance, direction, coin, amount}`. It does **not** currently include the other coin's balance, so a pure viewer cannot show both BTC and USDT for historical rows.
- Fix: extend the DB function so future adjustments snapshot both BTC and USDT, then build the viewer.

## What to build

### 1. Migration — enrich the snapshot
Update `public.admin_apply_transaction_action` so the `adjust-balance` branch snapshots both BTC and USDT balances (in addition to the existing per-coin balance):

- Before write: read the target user's current BTC and USDT balances from `wallet_balances`.
- After write: compute post-change BTC and USDT (only the adjusted coin changes; the other is unchanged).
- Store:
  - `before = { btc, usdt, coin, coin_balance }`
  - `after  = { btc, usdt, coin, coin_balance, direction, amount }`
- All other actions (`edit`, `set-status`, `reverse`, `delete`) stay exactly as they are.

For rows written before this migration, the viewer falls back to showing the single `balance` field it has and marks the missing side as "—".

### 2. UI — new "Audit" tab in `AdminTransactions.tsx`

- Add a 6th `TabsTrigger value="audit"` to the existing `TabsList` (grid becomes `grid-cols-6`).
- Inside a `TabsContent value="audit"`, render a separate loader/state (`auditRows`, `auditLoading`) that queries:
  ```
  supabase.from("admin_transaction_log")
    .select("*")
    .eq("action", "adjust-balance")
    .order("created_at", { ascending: false })
    .limit(500)
  ```
- Reuse the existing filter bar for **user id contains** and **date range**; hide the Status/Coin filters while on this tab (they don't apply). Optionally add a `Direction` filter (all / credit / debit) sourced from `after.direction`.
- Table columns:
  1. Date
  2. Admin (short `admin_user_id`, monospace)
  3. Target user (short `target_user_id`, monospace)
  4. Coin (`after.coin`)
  5. Direction badge (green "credit" / red "debit")
  6. Amount (`after.amount`)
  7. BTC before → BTC after
  8. USDT before → USDT after
  9. Reason (truncated with tooltip / full text on row expand)
- CSV export: when the Audit tab is active, "Export CSV" exports these audit columns instead of the transactions columns.
- Empty state: "No manual adjustments recorded."

### 3. No changes to
- `admin-transactions` edge function
- `ManualBalanceAdjustment.tsx`
- Any other page or route

## Technical details

- The admin-only RLS policy already on `admin_transaction_log` gates client reads to admins, matching how `AdminTransactions.tsx` reads other tables directly.
- Numeric formatting: BTC to 8 decimals, USDT to 2 decimals; render `—` when a side is missing (older rows).
- Keep the tab lazy: only fetch audit rows the first time the user opens the Audit tab, then cache in state and refresh via the existing Refresh button.

## Out of scope

- Backfilling BTC/USDT snapshots into pre-existing log rows.
- Auditing non-`adjust-balance` actions in this tab (they remain accessible via each row's existing Edit/Status/Reverse/Delete flow, which already writes to the same log table).
