# Sync Crypto Prices to Live CoinMarketCap Data

## Goal
Replace the current simulated price updater (which randomly nudges prices ±2%) with a real price feed sourced from CoinMarketCap so every coin in `coin_prices` matches the current market price shown on coinmarketcap.com.

## Approach

**1. Rewrite `supabase/functions/update-prices/index.ts`**
- Fetch live quotes from CoinMarketCap's `/v1/cryptocurrency/quotes/latest` endpoint using the symbols currently in the `coin_prices` table.
- For each coin, update `price` and `change_24h` with the real values returned by CoinMarketCap.
- Keep the existing CCT (Caltex Token) row untouched, since CCT is our internal token and not listed on CoinMarketCap — its price continues to be managed by `update-cct-price-history`.
- Preserve the existing schema, CORS, and response shape so the scheduled invoker and any callers keep working.

**2. Secret**
- Requires a `COINMARKETCAP_API_KEY`. CoinMarketCap offers a free "Basic" tier key that covers this use case. I will request it via the secure secret prompt once you approve the plan.

**3. Frontend**
- No frontend changes needed. `useRealtimePrices`, `PriceSparkline`, and `CCTPriceChart` already read from `coin_prices` / `coin_price_history` via Supabase Realtime, so they will automatically reflect the accurate values as soon as the edge function runs.

**4. Refresh cadence**
- The existing cron that calls `update-prices` continues to drive updates (typically every ~1 min). CoinMarketCap's free tier easily supports that rate for a handful of symbols.

## Files changed
- `supabase/functions/update-prices/index.ts` (rewrite logic; CORS + response unchanged)

## What stays the same
- CCT price behavior and history
- Realtime subscriptions
- `coin_price_history` writer (`update-cct-price-history`)
- All UI components

## What you need to provide
- A CoinMarketCap API key (free tier is fine — grab one at `pro.coinmarketcap.com` → Sign up → Copy your API key). I'll prompt for it securely after you approve.
