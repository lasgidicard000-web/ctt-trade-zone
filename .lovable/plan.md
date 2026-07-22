## Goal

Debit $1,000 from Jeremy Element's total portfolio and activate a Superintendent Plan, keeping his remaining balance accurate and logging the transaction in history.

## Steps

1. **Debit BTC wallet** (`wallet_balances`)
   - Current: 0.01623720 BTC (~$1,031 @ $63,496.12/BTC).
   - Deduct 1000/63496.12 ≈ 0.01574905 BTC.
   - New balance: ~0.00048815 BTC (~$31 remaining unused).

2. **Create Superintendent Plan investment** (`user_investments`)
   - `template_id`: d08c4a99-8a00-4100-818f-5ffb1b75fa25
   - `plan_id`: `superintendent`, `plan_name`: `Superintendent Plan`
   - `amount`: 1000, `daily_roi`: 0.032, `duration_days`: 60
   - `status`: active, `started_at`: now(), `ends_at`: now() + 60 days.

3. **Log transaction** (`transactions`)
   - `type`: `plan_purchase`, `from_symbol`: `BTC`, `amount`: 1000, `status`: `completed`, `created_at`: now().

## Result

- Portfolio Balance shows ~$31 unused BTC plus live daily ROI from Recruit, Inspectors, and the new Superintendent plans.
- Transaction History includes the $1,000 Superintendent plan purchase.
- $1,000 locked as Superintendent principal for 60 days at 3.2% daily ROI.
