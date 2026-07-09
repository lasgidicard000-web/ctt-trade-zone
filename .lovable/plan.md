## Goal
Show each user's **currently running investment** on their dashboard (Wallet page), so they can see which plan they're on, how much they invested, days elapsed / remaining, and accrued profit.

## What needs to change

### 1. New table: `user_investments`
Tracks an activated plan per user.

Columns (domain-specific):
- `plan_id` — one of `recruit`, `inspectors`, `superintendent`, `commissioners`, `general`
- `plan_name`
- `amount` — USD principal
- `daily_roi` — numeric (e.g. 0.01 for 1%)
- `duration_days`
- `status` — `active` | `completed` | `cancelled`
- `started_at`, `ends_at`

Access rules:
- Users can view their own active investments.
- Users cannot create/edit directly — only admins can (activation happens after admin verifies deposit, same pattern as manual deposits).
- Admins can view, create, update, delete any.

### 2. Admin activation UI
In `AdminDepositManagement` (or a new small section next to it), add an "Activate plan" action per user: pick plan + amount + start date → inserts a row into `user_investments`.

### 3. Dashboard card: `ActiveInvestmentCard`
New component shown on the Wallet page (top of the page, above balances).

Shows for each active investment:
- Plan name + tier badge (Bronze/Silver/Gold/…)
- Principal invested (e.g. `$200.00`)
- Live accrued profit = `principal × daily_roi × days_elapsed` (ticks every second)
- Progress bar: `days_elapsed / duration_days`
- Days remaining + end date
- "Running" status pill with a pulsing dot

If no active investment → small empty state with a link to `/investment-plans`.

### 4. Jeremy Element seed
After the table exists, insert one active `Recruit Plan` row for Jeremy: `amount=200`, `daily_roi=0.01`, `duration_days=30`, `started_at=now()`. This matches the earlier $200 BTC approval so his dashboard immediately shows the running investment.

## Technical notes
- Table lives in `public.user_investments`, RLS enabled, GRANTs for `authenticated` (select) and `service_role` (all). No `anon` access.
- Compute accrued profit client-side from `started_at` + `daily_roi` — no cron needed for display.
- Wallet page fetches with `.eq('user_id', user.id).eq('status','active')`.
- Realtime subscription so admin activation appears instantly on the user's dashboard.

## Out of scope
- Auto-payout / auto-completion when `ends_at` passes (can be added later via edge function).
- Withdrawing profit from an investment (existing withdrawal flow stays as-is).