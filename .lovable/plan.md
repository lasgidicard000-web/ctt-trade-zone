# Live, auto-updating trade history for Jeremy (and all members)

## Goal
Each real trade in Live Trading history shows its fill price plus a P&L that updates on its own as the market moves. New trades and price changes appear without a page refresh. No trades are invented or edited; only Jeremy's existing real records (4 BTC buys plus the market sale) are displayed.

## What members will see
- Trade history rows show: side, fill price, qty, amount, fee, **current market price**, and **P&L**.
  - Sell rows: the realised P&L stored at the time of the sale (fixed).
  - Buy rows whose coins are still held: live unrealised P&L, worked out as (current price - fill price) x qty - fee. It is labelled "Unrealised" and updates as the price moves.
  - Buy rows that have already been sold: labelled "Closed" and point to the sale that realised them.
- The P&L summary row (Trading P&L / Card funding / Withdrawals / Admin adjustments) recalculates live.
- A small "Live" indicator appears while updates are streaming.

## Technical details
- Turn on realtime updates for `live_trades`, `live_holdings`, `live_orders` and `live_accounts`, and confirm `coin_prices` is already enabled. RLS already limits each member to their own rows.
- In `useLiveTrading.ts`, add one `useEffect` channel, filtered by `user_id`, that calls `refresh()` with a debounce. It also subscribes to `coin_prices` and keeps a `prices` map in state. The channel is removed on unmount.
- Add a pure helper `computeTradePnl(trades, holdings, prices)`. It matches buys to sells FIFO per symbol, which tells it which buys are open and which are closed. Unit-test it with Jeremy's real data shape.
- In `LiveTrading.tsx`, the history table uses the helper for its Market price and P&L columns, and the summary uses live prices instead of a snapshot.
- Verify by signing in as Jeremy in Playwright. Confirm his 5 real trades render, then change a test price and confirm the P&L updates.

## Out of scope
- Creating, doubling or relabelling trades. The $1,750 and $1,970 entries stay as they are.
