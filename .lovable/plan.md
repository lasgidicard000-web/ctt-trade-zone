## Update Jeremy Element's Wallet Balance

**Target account:** Jeremy Element — `b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5` (the one with the active Inspectors Plan)

**Goal:** Portfolio shows a single BTC balance worth $719 (existing $219 value + newly deposited $500 BTC).

### Conversion
- Live BTC price (from `coin_prices`): **$63,496.12 / BTC**
- $719 ÷ $63,496.12 = **0.01132353 BTC**

### Changes
1. **Update `wallet_balances`** for user `b12f35e2…`:
   - Set `BTC` balance → `0.01132353`
   - Set `USDT` balance → `0` (consolidated into BTC per your choice)
2. **Insert audit records in `transactions`** so the change is visible in transaction history:
   - `deposit` / BTC / `0.00787373` BTC (the $500 top-up) / status `completed`
   - `admin_adjustment` note for the USDT → BTC consolidation
3. **Insert a `deposit_history` row** for the $500 BTC deposit so it appears as a confirmed deposit.

No schema changes and no changes to the other Jeremy account (`a929…`).

### After apply
Wallet section for Jeremy will show:
- BTC: 0.01132353 (≈ $719.00)
- USDT: 0
- Portfolio total: ≈ $719
