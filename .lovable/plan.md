# Bybit-Style Demo Trading + Trading Bots

Two new sections, both fully functional on demo (paper) funds so nothing touches real portfolio balances.

## 1. Demo Trading Terminal (`/demo-trading`)

A Bybit-like trading screen:

- **Market header** — pair selector (BTC, ETH, USDT pairs + CCT/USDT), last price, 24h change, high/low, volume, all driven by live prices already streaming in the app.
- **Chart panel** — candlestick/area chart with 1H / 24H / 7D timeframes, reusing existing price-history data.
- **Order book + recent trades** — live-feel bid/ask ladder with depth bars and a rolling trade tape, generated around the real last price and refreshed on each tick.
- **Order panel** — Spot and Futures tabs:
  - Spot: Market / Limit, Buy & Sell, amount + percentage shortcuts (25/50/75/100%), fee and total preview.
  - Futures: Long / Short, leverage slider (1x–50x), margin, liquidation price and PnL preview.
- **Positions / Open orders / History tabs** — live unrealised PnL per position, close-position and cancel-order actions, realised PnL on close.
- **Demo wallet card** — starting demo balance of 10,000 USDT, equity, available margin, total PnL, and a "Reset demo account" button.

Limit orders fill automatically when the live price crosses the limit; futures positions liquidate automatically when the price hits the liquidation level.

## 2. Trading Bots (`/trading-bots`)

- **Bot marketplace grid** — Grid Bot, DCA Bot, Martingale Bot, AI Trend Bot: each with strategy description, risk level, suggested pair and historical demo performance.
- **Create bot dialog** — pair, strategy, investment (from demo balance), grid range / grid count or DCA interval + safety orders, take-profit and stop-loss.
- **My bots list** — status (running / paused / stopped), runtime, invested amount, current PnL and ROI %, number of executed trades, plus Pause / Resume / Stop actions.
- **Bot detail view** — equity curve, trade log of every bot fill, and per-bot settings.
- Bots execute against live prices on a recurring server tick, so PnL keeps moving even when the page is closed.

Both pages get entries in the navbar (auth-required) alongside the existing Simulator.

## Technical notes

- New tables: `demo_accounts`, `demo_orders`, `demo_positions`, `demo_trades`, `trading_bots`, `bot_trades` — all with RLS scoped to `auth.uid()` plus the required GRANTs, and admin read access via `has_role`.
- Server-side order matching, liquidation and bot execution live in a new `demo-trading-engine` edge function, invoked on user actions and on a schedule for bot ticks; balances and fills are computed server-side so the client cannot fabricate PnL.
- Reuse `useRealtimePrices`, `CCTPriceChart` patterns, and existing shadcn/design tokens — no new colour literals.
- Existing `/simulator`, wallet, plans and card flows stay untouched.
