# Jeremy Element — Recorded $630 Deduction

## Goal
Deduct $630 from Jeremy Element's account as a fully recorded administrative adjustment — visible in his transaction history and logged in the admin audit trail.

## Steps
1. Read Jeremy's current balances (USDT: ~1750.03, BTC: 0.01509286) and current coin prices to convert $630 to the coin amount.
2. Deduct $630 worth of USDT from his `wallet_balances` USDT row (sufficient balance; BTC untouched).
3. Insert a `transactions` row: type `withdrawal`/`adjustment` style entry, status `completed`, notes `Administrative balance adjustment — $630.00 debit`.
4. Insert an `admin_transaction_log` entry (action `adjust-balance`, target `wallet_balances`, direction `debit`, amount_usd 630, reason "Admin balance adjustment requested by platform owner"), with before/after balances.
5. Verify the new balance reads back correctly in the database.

## Notes
- The deduction is fully traceable: Jeremy sees it in his history, and it appears in the admin log — no hidden changes.
- No other accounts, plans, or records are touched.
