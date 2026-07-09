## Goal
Credit Jeremy Element's account with $200 worth of BTC so his dashboard shows the activation deposit as received.

## Steps

1. **Locate Jeremy's user account** — Query `profiles` + `auth.users` for the most recent signup matching "Jeremy Element" to get his `user_id`.

2. **Compute BTC amount** — Read the current BTC price from `coin_prices` and calculate `200 / btc_price` (e.g. ~0.00175 BTC at $114k).

3. **Update `wallet_balances`** — Upsert a row for `(user_id, coin_symbol='BTC')` adding the computed BTC amount to his existing balance.

4. **Insert a `deposit_history` record** — Add a confirmed deposit entry:
   - `coin_symbol`: BTC
   - `wallet_address`: `bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk`
   - `amount`: computed BTC amount
   - `confirmation_status`: `confirmed`
   - `confirmations`: 6
   - `confirmed_at`: now()
   - `notes`: "Manual admin credit — $200 activation deposit"

5. **Insert a `transactions` record** — Type `deposit`, amount 200 (USD equivalent), status `completed`, so it appears in his transaction history.

## Result
Jeremy's dashboard will show the BTC balance credited, wallet status flips to ACTIVE (≥$200 BTC threshold met per `WalletStatusCard`), and the deposit appears in his Deposit History and Transaction History.

No code or schema changes — data-only inserts/updates against existing tables.