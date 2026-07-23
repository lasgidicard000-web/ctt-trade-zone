# Credit $200 BTC to Samuel Starbox

**User:** samuelstarbox@gmail.com (`20546f05-4cdf-4178-b0df-a12b207b7677`)
**BTC price:** $63,496.12 → **0.00314980 BTC ≈ $200**

## Data changes

1. **wallet_balances** — upsert BTC balance for user, adding 0.00314980 BTC (create row if none exists).
2. **deposit_history** — insert confirmed BTC deposit row (amount 0.00314980, coin_symbol `BTC`, status `confirmed`, note "Manual credit — $200 BTC").
3. **transactions** — insert `deposit` row (to_symbol `BTC`, amount 0.00314980, status `completed`) so it appears in his history.

No schema or UI changes.
