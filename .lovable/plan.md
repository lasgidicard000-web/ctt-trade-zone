## Goal

Restore Jeremy Element's wallet to a spendable $1,031 total portfolio balance and log the recent $532 deposit as a 40‑minute‑old transaction.

## Steps

1. **Reset Jeremy's wallet balance** (`wallet_balances`)
   - Set his BTC balance to the equivalent of $1,031 USD using the current BTC price in `coin_prices`.
   - Zero out any USDT balance so the portfolio total reflects exactly $1,031 from BTC.
   - Leave his active plans (`user_investments` Recruit + Inspectors) untouched — their principal stays locked inside those investments, unrelated to this wallet total.

2. **Insert a deposit record for the $532** (`deposit_history`)
   - Coin: BTC, amount: BTC equivalent of $532 at current price.
   - `wallet_address`: `bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk` (project's fixed BTC address).
   - `confirmation_status`: `confirmed`, `confirmations`: 6.
   - `created_at` and `confirmed_at`: `now() - interval '40 minutes'`.

3. **Insert a matching transaction** (`transactions`)
   - `type`: `deposit`, `to_symbol`: `BTC`, `amount`: BTC equivalent of $532.
   - `status`: `completed`.
   - `created_at`: `now() - interval '40 minutes'`.

4. **Result on his dashboard**
   - Total Portfolio Value = wallet ($1,031) + live accrued profits from his two active plans.
   - The full $1,031 sits in his BTC wallet and is available for withdrawal or for the Purchase Plan flow.
   - Transaction History shows the $532 BTC deposit dated 40 minutes ago.

## Technical details

- Pure data operation via the insert tool — no schema changes, no code changes.
- Use the current `coin_prices` BTC price at execution time to compute both the $1,031 wallet balance and the $532 deposit amount, so the USD equivalents match what the dashboard renders.
