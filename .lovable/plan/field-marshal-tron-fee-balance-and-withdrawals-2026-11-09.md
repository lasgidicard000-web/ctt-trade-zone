# Field Marshal TRON Fee Balance and Withdrawals

## What will change
- Verify and record Jeremy Element’s supplied TRON transfer as the source for a $300 gas-fee balance. The public chain record confirms a successful 942.565823 TRX transfer to the app’s published TRON fee address; historical pricing places it at about $300.80. Record the requested $300.00 credit and the transaction hash, rather than presenting an unverified amount as exact.
- Add a secure per-member TRON fee ledger and a balance notice in Field Marshal dashboards. Jeremy’s verified receipt will show as paid with the transaction reference; other Field Marshal members will see their own balance and fee history.
- Apply the user-confirmed fee schedule to Field Marshal BTC/USDT wallet withdrawal requests: $5 below $100, $10 from $100 through $1,000, and $100 above $1,000. Deduct the gas fee when a request is accepted; refund that reserved fee if an administrator rejects the withdrawal.
- Keep withdrawals visibly pending until an administrator approves them. Approval marks the matching request and transaction completed; rejection restores the withdrawal funds and gas-fee balance.
- Ensure a request that is accepted shows a pending confirmation, not a paid/completed state. Keep minimum-amount validation visible; use a neutral submission status for genuine backend failures rather than falsely showing a pending request.

## Technical approach
- Use a restricted, authenticated ledger with server-side validation and atomic database functions for gas-balance credits/debits/refunds; do not trust client-provided fees or balances.
- Apply the Field Marshal fee schedule to the existing wallet USDT withdrawal and live trading external withdrawal paths, with the existing admin approval workflows as the only way to mark payouts complete. Display the member’s fee balance and pending request status in their dashboards and withdrawal history.
- Keep other plan members’ existing fee rules unchanged. Do not label the $300 as a network transaction payout or a completed withdrawal.

## Verification
- Test the concrete fee thresholds ($5 under $100; $10 at $100 and $1,000; $100 above $1,000), request-time debit, rejection refund, pending-to-completed admin approval, and Jeremy’s $300 hash-linked ledger entry.
- Check Field Marshal member and admin screens for the balance, fee, and request status; review app build and relevant tests.
