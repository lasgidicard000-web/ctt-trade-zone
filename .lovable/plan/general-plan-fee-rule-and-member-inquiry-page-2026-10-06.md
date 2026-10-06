# General plan fee rule and member inquiry page

## What members will see
- **Fee notice** on the wallet and General dashboard for every member with an active General plan: "General plan maintenance fee: $630, due once every 2 years, in the first week of October." It shows the due date, what the fee covers, and the member's current balance.
- **Pay $630 button.** The member has to tick "I have read and agree" before paying. Nothing is ever taken automatically.
- **After payment:** a completed history entry labelled "General plan maintenance fee — $630.00" and a receipt.
- **Fee inquiries button** opens a page with:
  - The member's own fee history: dates, amounts, and how many times paid.
  - Real totals across all General members, anonymised: how many members are covered, how many paid, how many are pending, and payments by month since the rule started. No names, emails or addresses.
  - A "Send an inquiry" form that goes to the admin inbox.

## What admins will see
- A new **General Plan Fee** tab in the admin dashboard:
  - Fee settings: amount (set to $630), cycle (2 years), due week (first week of October), and an on/off switch.
  - A list of real General members with name, email, wallet address, fee dates, times paid, and status (paid, due, not yet due).
  - Member inquiries, with a reply option.

## Fairness rules
- The rule applies from today. No fees are charged or recorded before today.
- Jeremy's earlier $630 stays labelled as an admin adjustment, because it was taken before this rule existed. Admins can refund it if they choose.
- Members can pay a fee only once per 2-year cycle.

## Technical details
- `app_settings` key `general_plan_fee` stores `{ amount_usd, cycle_months: 24, due_month: 10, due_week: 1, enabled, effective_from }`.
- New tables, each with GRANTs, RLS (owner select, admin via `has_role`) and service_role:
  - `plan_fee_charges`: user_id, cycle_start, amount_usd, paid_at, transaction_id. Unique on (user_id, cycle_start).
  - `plan_fee_inquiries`: user_id, message, status, admin_reply.
- Security-definer functions:
  - `pay_general_plan_fee(_agree bool)` checks the member has an active General plan and agreed, that the cycle is due and unpaid, and that the USDT balance covers the fee. It then debits USDT, inserts the transaction and the charge, and returns a receipt.
  - `get_general_fee_status()` returns the member's own status.
  - `get_general_fee_stats()` returns anonymised aggregates only.
  - `admin_list_general_fee_members()` is admin-gated and joins profiles, deposit addresses and charges.
- UI: `GeneralFeeNotice` (Wallet, GeneralDashboard), `/general-fee` inquiry page, and `AdminGeneralFee` tab in Admin.tsx.
- Check with `bunx tsgo --noEmit`, then test the pay flow in Playwright as Jeremy.
