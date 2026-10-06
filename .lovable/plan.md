# Add $161 external BTC deposit to Jeremy Element

## What will happen
- Credit Jeremy's BTC wallet with $161 worth of BTC, using today's BTC market price.
- Add a confirmed entry to his deposit history with transaction hash `ed5c34e22a8cb76ca79c65c6c65355d40fd3536cdeac0d62155de3d568f6fc28`.
- Add a completed "deposit" entry to his transaction history, labelled "External BTC deposit — $161.00".
- Record the deposit in the admin audit log with his balance before and after.

## Not included
- Relabelling the $630 deduction as a recurring General plan fee.
- An inquiry page showing made-up members, addresses, or deduction histories.

## Technical details
- Read the BTC price from coin_prices and Jeremy's current BTC wallet balance.
- Insert into deposit_history (confirmation_status 'confirmed', confirmed_at now()), update wallet_balances BTC, insert into transactions, and insert into admin_transaction_log (action 'adjust-balance').
- Check the new balance with a read query.
