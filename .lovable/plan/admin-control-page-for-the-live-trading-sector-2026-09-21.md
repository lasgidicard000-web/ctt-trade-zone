# Admin control page for the Live Trading sector

A new "Live Trading" tab in the admin panel that lets you set the rules for the live terminal, watch every member's live account, adjust or freeze individual members, and clear live withdrawal requests.

## What you'll be able to do

### 1. Global rules
One settings card with:
- Live trading on / off (when off, members see a maintenance notice instead of the trade panel and orders are rejected)
- Trading fee percentage (currently fixed at 0.1%)
- Minimum order size (currently $10)
- Minimum card funding amount (currently $10)
- Minimum withdrawal amount and withdrawal fee percentage (currently $10 and 1%, minimum $1)
- Save button, plus a note showing who changed the rules last and when

### 2. Activity monitor
A table of every member with a live account: name, live balance, realised profit/loss, open orders, number of trades, current holdings value, total funded, last activity. Sortable and searchable, with totals across the platform at the top (total live balance, total funded, total profit/loss, open order count).

### 3. Per-member controls
Opening a member row gives you:
- Credit or debit their live balance with a reason (recorded in the audit log)
- Freeze / unfreeze live trading for that member only
- Force-close their holdings at current market prices (proceeds return to their live balance)
- Their recent orders, trades, funding and withdrawals

### 4. Withdrawal queue
Every live trading withdrawal with status, amount, fee, destination address and date, filtered All / Pending / Paid / Declined, with Approve and Decline buttons and an optional note. Declines return the money to the member's live balance.

Coins stay as they are — all listed coins remain tradable.

## Technical notes

**Settings storage** — one `app_settings` row under key `live_trading_settings` holding `{ enabled, fee_pct, min_order_usd, min_funding_usd, min_withdrawal_usd, withdrawal_fee_pct, withdrawal_fee_min }`, plus `updated_by`/`updated_at`. A helper `public.live_settings()` returns the row merged over defaults so existing behaviour is unchanged if the row is absent.

**Migration**
- `live_settings()` helper (stable, security definer, search_path public).
- Rewrite `live_place_order`, `live_engine_tick`, `live_fund_from_card` and `live_withdraw` to read fee and minimum values from `live_settings()` instead of hardcoded literals, and to raise `live trading is disabled` when `enabled = false` or when the caller's account is frozen.
- Add `frozen boolean not null default false` and `frozen_reason text` to `live_accounts` (additive, nullable/defaulted).
- New admin RPCs, all `security definer`, gated on `public.has_role(auth.uid(),'admin')`, granted to `authenticated` and `service_role` only (revoke from `public`/`anon`):
  - `admin_set_live_settings(_settings jsonb)` — upserts the `app_settings` row, writes `admin_transaction_log`.
  - `admin_adjust_live_balance(_user_id uuid, _amount numeric, _reason text)` — signed adjustment, ensures the account exists, logs before/after.
  - `admin_set_live_freeze(_user_id uuid, _frozen boolean, _reason text)`.
  - `admin_close_live_holdings(_user_id uuid)` — sells every holding at `live_price`, credits the balance, records `live_trades` rows and realised P&L.
  - `admin_list_live_accounts()` — returns a per-member aggregate row set (balance, realised P&L, holdings value, open orders, trade count, funded total, frozen flag, last trade time) joined to `profiles`.

**Frontend**
- `src/components/admin/AdminLiveTrading.tsx` — settings form, platform totals, member table with expandable per-member drawer, and the withdrawal queue; follows the existing patterns in `AdminMerchantPayments.tsx` / `AdminMembers.tsx`.
- `src/pages/Admin.tsx` — add a `live` tab between Members and Merchant Payments, widen the tab grid, show a pending-withdrawal count badge.
- Withdrawal approval reuses the existing `process-withdrawal` edge function path so live refunds keep going back to the live balance (as fixed earlier), with the queue filtered to `notes like 'Live trading%'`.
- `src/pages/LiveTrading.tsx` and `src/hooks/useLiveTrading.ts` — read the settings row to show the live minimums/fee in the UI and render a disabled/maintenance state when trading is off or the account is frozen.
