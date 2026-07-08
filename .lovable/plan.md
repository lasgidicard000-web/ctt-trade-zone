# Investment Plans Page Refactor

Scope: `src/pages/InvestmentPlans.tsx` only. No changes to Wallet, dashboard, backend, or any other page/component.

## 1. Remove Portfolio Value block
- In the hero-side Card (lines ~621–638), remove the "Portfolio Value / $128,473" block entirely (including the `AnimatedCounter` usage there).
- Replace that top row with a neutral header: plan/status label "AI Trading Engine" + existing "AI Online" pill (no monetary value, no balance).
- Keep the rest of the card (Market Sentiment, Today's Performance, live BTC/ETH prices) intact.

## 2. Remove fixed ROI from plans
- In the `plans` array, keep `dailyROI` field only as internal reference (or drop it) — but do NOT render it anywhere in UI.
- Delete the `Row label="Daily ROI"` line in the plan card (line ~831).
- Remove `({p.dailyROI}/day)` from the estimator select (line ~959).
- Update the estimator: instead of compounding a fixed daily %, present it as an "Estimated Performance Range" using a low/high band derived from a plan-level `performanceRange` (e.g. `{ low: 0.6, high: 1.4 }` %/day) with a clear "Projected range — not guaranteed" disclaimer. Show low/mid/high projected values.
- Rewrite plan description strings and features list to drop "X% daily ROI" wording; replace with market-performance phrasing.
- Update the FAQ answer (line ~529, ~533) to remove ROI language.

## 3. New dynamic performance indicators on each plan card
For each plan card add a compact metrics block replacing the ROI row:
- Today's Performance (small % + up/down icon, colored)
- 7-Day Performance
- 30-Day Performance
- Estimated Performance Range (low – high %)
- Market Trend Indicator (Bullish / Neutral / Bearish pill)
- AI Confidence Level (progress bar, %)
- Risk Level (Low / Medium / High badge — reuse existing riskLevel field)

Values come from per-plan static config fields added to each plan object (`todayPerf`, `weekPerf`, `monthPerf`, `perfRange`, `marketTrend`, `aiConfidence`). Label the block "Market-based performance metrics — not guaranteed returns."

## 4. Two trading options per plan
Add a `TradingModeSelector` inside each plan card (segmented control, 2 buttons):
- Automated AI Trading Engine (default)
- Manual Trading Signals

State: `selectedMode[planId]` in local component state. The chosen mode is passed into the Deposit dialog and shown as a summary line ("Mode: Automated AI Trading Engine"). Each mode has an info `?` icon linking to the corresponding info section anchor (see section 6).

## 5. Wire up every button
Audit every `<Button>`/`<Link>` on the page and ensure each has a real destination or handler:
- Deposit & Activate → navigate to `/wallet` (existing deposit page) with the selected plan + mode as URL query params (`?plan=starter&mode=auto`); after dialog confirmation also show a "Go to Dashboard" shortcut (Link to `/`).
- Plan Details → scroll/anchor to that plan's expanded details section (add unique `id` per plan card) or open existing details view.
- AI Trading Engine Info → anchor `#ai-engine` (existing AI Trading Engine section on page).
- Manual Trading Signals Info → new small anchor section `#manual-signals` (short descriptive block, no dead CTAs) added inline near the AI engine section.
- Referral Rewards → `/` route section anchor or `/leaderboard` (whichever exists — use `/leaderboard` link + existing referral card on Index; fallback to `/#referral` if present). Confirmed target: `/leaderboard`.
- Dashboard → `/` (Index dashboard).
- Deposit Page → `/wallet`.
- FAQ → anchor `#faq` (existing FAQ section — add id).
- Support → open Tawk.to (`window.Tawk_API?.maximize()`), fallback `mailto:ctttradezone@caltexvault.com`.

Remove or replace any `<Button>` without an `onClick`, `asChild+Link`, or `href`. Includes the "View AI Trading Center" if it points nowhere meaningful — keep pointing to `/simulator` (valid).

Add a persistent "Quick Links" strip near page bottom with the 8 destinations above so nothing is buried.

## 6. Preservation
- Keep hero, plan cards layout, trust bar, live market, AI engine, estimator, security, activity feed, testimonials, FAQ sections.
- Keep animations, Reveal wrappers, gradients, and existing styling tokens.
- No changes outside `src/pages/InvestmentPlans.tsx`.

## Technical notes
- Add types: `type TradingMode = "auto" | "manual"`.
- Plan interface additions: `todayPerf: number; weekPerf: number; monthPerf: number; perfRange: [number, number]; marketTrend: "Bullish"|"Neutral"|"Bearish"; aiConfidence: number;`.
- Deposit dialog passes `?plan=<id>&mode=<mode>` via `navigate()` to `/wallet` on submit; Wallet page is not modified — the query params are simply informational and harmless.
- All new copy explicitly frames metrics as market-based, not guaranteed.
