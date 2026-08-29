# Real market crypto prices, still admin-adjustable

## What's happening now

Prices in the database are stale: BTC and ETH were last updated on 28 Aug, and BNB and USDT haven't moved since 7 Jul. The live-price function exists and is wired to CoinMarketCap with a valid API key, but nothing ever calls it — the only scheduled job in the database is the daily ROI roll. So the app shows frozen numbers instead of market prices.

## What will change

1. **Real prices, continuously**
   - Schedule the existing price fetcher to run every 2 minutes so BTC, ETH, BNB, USDT (and any coin added later) always show the live market price and 24h change, matching what you'd see on CoinMarketCap.
   - Run it once immediately so the dashboard corrects itself right away.
   - Caltex Token (CTT) stays internal and is never touched by the market feed.

2. **Admin override that actually sticks**
   - Today an admin can type a new price, but the next market sync would wipe it. Each coin gets a "Live market" / "Manual (locked)" state.
   - When a coin is locked, the market sync skips it and the admin-entered price stays until unlocked.
   - The admin Coin Prices tab gets: a lock toggle per coin, the current source and last-updated time, and a "Sync live prices now" button.
   - Unlocking a coin lets the next sync pull it back to the real market price.

3. **Freshness signal**
   - The wallet/trading price displays show the last sync time so a stalled feed is visible instead of silently frozen.

## Technical notes

- Migration: add `price_source text default 'live'` (values `live` / `manual`), `locked boolean default false`, and `manual_by uuid` to `coin_prices`; existing rows default to live.
- `supabase/functions/update-prices/index.ts`: skip rows where `locked = true` (in addition to the CCT/CTT internal exclusion), and stamp `price_source = 'live'` on successful updates.
- Cron: `cron.schedule('update-coin-prices', '*/2 * * * *', ...)` invoking the `update-prices` function via `net.http_post`, following the pattern already used for the email queue / ROI roll jobs.
- Admin UI (`src/pages/Admin.tsx`, prices tab): lock switch writing `locked` + `price_source = 'manual'`, plus a sync button calling `supabase.functions.invoke('update-prices')`. Writes stay admin-gated by the existing `coin_prices` policies.
- No changes to `useRealtimePrices` subscription logic beyond surfacing `updated_at`; realtime updates already propagate each sync to every open dashboard.
