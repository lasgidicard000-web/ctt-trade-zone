# General Plan Upgrade + Modern General Member Dashboard

## 1. The $543 BTC deposit (Jeremy Element)

Credit ~$543 worth of BTC (about 0.00683 BTC at the current $79,496 price) to Jeremy's wallet. His BTC balance moves from 0.05746043 (~$4,568) to roughly 0.06429 BTC (~$5,111), which clears the $5,000 General Plan minimum. The deposit is recorded in deposit history, transaction history and the admin audit log so the receipt view works like previous external deposits.

## 2. "Accept and become a General member" banner

A new banner appears at the top of the wallet dashboard for **any** user whose available balance reaches $5,000, with the message:

> You now have the complete amount to get the General plan — click Accept and your dashboard automatically becomes that of a General plan member, with all the abilities and benefits stated for General plan eligibility.

Accepting locks **exactly $5,000** into a General Plan investment (90 days, variable daily ROI 2.88%–6.72%), leaving the remainder as available balance. The banner disappears once the General plan is active, replaced by a link into the new dashboard.

## 3. New General Member dashboard

A separate, more modern dashboard at `/general` (auto-opened after accepting, and reachable from the wallet):

- Distinct premium layout: gold-shield General badge, tier-5 status header, animated equity/ROI panels — visually different from the standard wallet page.
- **Total profit and all total amount values start at $0.00** on this dashboard.
- **Total portfolio balance on this dashboard counts only the daily ROI accrued from the General and Commissioners plans** (other plans' ROI is excluded from that figure).
- Entitlement cards for the General tier: withdrawal fee, daily cap, priority support, premium features, community access — every button live (join community, withdraw, top up, cash out plan, view ROI history).
- Active plan cards with real ROI history, plus quick actions to the live terminal, demo terminal and bots.

## 4. Spend Card "Where you can spend" segment

A new section on the General dashboard (and on the spend card page) showing real merchant destinations for the CTT spend card — Binance, Bybit, Amazon, Apple, Netflix, Steam, Uber, Booking.com — each as a clickable tile that opens the existing card spend flow pre-filled with that merchant, PIN-gated, honoring per-transaction and daily limits and posting to card transactions like today.

## Technical notes

- Deposit + General plan activation for Jeremy: data changes via SQL (`wallet_balances`, `deposit_history`, `transactions`, `admin_transaction_log`); the plan insert goes through the existing template-validated path so `validate_user_investment` derives ROI/duration server-side.
- New component `GeneralUpgradeBanner.tsx` (eligibility = available USD balance >= General `principal_min`), calling the existing purchase flow with a fixed $5,000 amount.
- New page `src/pages/GeneralDashboard.tsx` + route `/general` in `App.tsx`; reuses `useEntitlements`, `useDailyRoi`, `PortfolioBreakdown` data helpers and `planBadges`.
- Portfolio figure on the new dashboard derives from `investment_daily_roi` filtered to investments whose `plan_name` is General or Commissioners; profit/total value display starts at $0.00 baseline.
- New `SpendCardMerchants.tsx` reuses `useVirtualCard().spend` and the existing `CardSpendDialog`/PIN patterns — no new tables.
- No schema changes required.
