# Live Trading Terminal (Card-Funded, Withdrawable)

A new real trading section at `/live-trading`, separate from the existing demo terminal and bots (those stay untouched).

## How it behaves

- **Balance starts empty.** Every user opens the terminal with a $0.00 live trading balance — no bonus, no demo funds.
- **The CTT spend card is the only deposit method.** The funding dialog is a card charge: enter an amount, authorize with the card (PIN-gated like other sensitive card actions), and the amount is charged to the card and credited to the live trading balance. No BTC address, no PayPal, no internal wallet transfer — those entry points are not offered on this page.
- Card rules already in place apply to funding: card must be active, per-transaction limit, daily limit, and sufficient BTC balance behind the card. Declines show the reason.
- **Trading:** spot Buy/Sell on the live pairs (BTC, ETH, USDT pairs, CCT/USDT) at the live price, with market and limit orders, fee preview, and percentage shortcuts. Filled trades move the live balance and per-coin live holdings; realised PnL is tracked.
- **Withdrawable:** a Withdraw panel lets the user send available live balance to an external wallet address (BTC / ETH / TRC-20), respecting the existing withdrawal rules — min $10, 1% fee (min $1), numeric-only addresses rejected. Requests go to the existing admin withdrawals queue for approval, and the amount is held out of the tradable balance while pending.
- **Activity tabs:** Funding (card deposits), Open orders, Trade history, Withdrawals — each with status.

## Page layout

Market header with pair selector and live price, chart panel, order book / trade tape, order panel on the right, and a top "Live balance" card showing balance, holdings value, equity, realised PnL, plus **Fund with card** and **Withdraw** buttons. Locked-state banner when the user has no active card: "Your CTT spend card is required to fund live trading."

## Technical notes

- New tables: `live_accounts` (balance, realized_pnl), `live_holdings` (coin, qty, avg_price), `live_orders`, `live_trades`, `live_funding` (card charge reference). RLS scoped to `auth.uid()` with the required GRANTs, plus admin read via `has_role`.
- New security-definer functions: `live_fund_from_card(_card_id, _amount_usd)` — reuses the existing `card_spend` debit path so the charge lands in `card_transactions` and the BTC wallet, then credits `live_accounts`; `live_place_order`, `live_cancel_order`, `live_close_all`, and `live_withdraw(_amount, _address)` which inserts into the existing `withdrawals` table and debits the live balance.
- Amounts, fees, fills and PnL are computed server-side from `coin_prices`; the client never writes balances. No direct INSERT/UPDATE policies on the new balance tables.
- Reuse `useRealtimePrices`, `PairChart`, `OrderBook`, `CardRevealDialog`/PIN patterns and existing design tokens.
- New route `/live-trading` in `src/App.tsx` and an auth-only navbar entry ("Live Trade") next to Demo Trade and Bots.
