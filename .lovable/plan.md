# Jeremy Element — Show Real Trading P&L

Goal: Jeremy's trading history and balance show what his trades actually earned or lost. Admin credits stay visible but are clearly labelled and kept separate from trading results.

## Step 0 — Wait for the backend
Nothing can run while Lovable Cloud is paused. Once you resume it, I'll check that it's healthy before continuing.

## Step 1 — Check the latest trade data
Pull Jeremy's live trades, holdings and account again. The last check showed 4 BTC buys (~$759), no sells, $0.00 realized P&L, and an open 0.00886554 BTC holding worth about +$3.59. Every figure below will come from the fresh data, not from these older numbers.

## Step 2 — Realize his real profit (already approved)
Close the open BTC holding at the market price using the normal close path. This records a real sell trade and moves the actual profit or loss into his realized P&L. The final number depends on the BTC price at that moment and could be a small gain or a small loss.

## Step 3 — Split the numbers on his Live Trading page
- **Trading P&L**: realized plus unrealized, taken only from his trades.
- **Funding and adjustments**: card funding, withdrawals, and admin credits/debits (including the $1,750) listed separately and labelled as such.
- **Balance**: the same total as now, with a breakdown showing how much came from trading and how much came from funding or adjustments.

## Step 4 — Check the result
Sign in as Jeremy in the preview and confirm the history shows the new sell trade, the P&L matches his trades, and the $1,750 still appears as an administrative adjustment.

## Out of scope
- Treating the $1,750, or any admin credit, as trading profit.
- Creating trades or changing trade results.

## Technical notes
- Run `admin_close_live_holdings(b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5)`. It writes to `live_trades` with the real pnl and updates `live_accounts.realized_pnl`.
- In `LiveTrading.tsx`, add a P&L breakdown card that reads from `useLiveTrading`. Trading P&L = `account.realized_pnl` plus unrealized, computed from holdings at the live price. Adjustments come from `transactions` whose notes start with "Administrative balance adjustment".
- This only changes what the page shows. No balance calculations change.
