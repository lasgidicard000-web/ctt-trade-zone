## Verify Jeremy Element's Wallet Balance

**Goal:** Confirm the wallet section reflects the consolidated $500 BTC deposit for Jeremy Element (`b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5`).

### Steps

1. **DB check** — Query `wallet_balances` for Jeremy's user_id and confirm:
   - BTC balance ≈ `0.01132353`
   - USDT balance = `0`
2. **Price check** — Read current BTC price from `coin_prices` and compute USD value (BTC balance × price). Expect ≈ $719.
3. **History check** — Verify the `$500` `deposit_history` row and the two `transactions` rows (deposit + admin_adjustment) exist.
4. **UI check** — Launch Playwright headless against `http://localhost:8080`, restore Jeremy's Supabase session, navigate to `/wallet`, and screenshot the portfolio total, BTC row, and USDT row. Confirm the rendered numbers match the DB values.
5. **Report** — Post the DB numbers, computed USD, and screenshot evidence. Flag any mismatch (e.g., stale cache, rounding, wrong price source in UI).

No code or data changes will be made — verification only.
