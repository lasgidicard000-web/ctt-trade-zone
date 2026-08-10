# Withdraw plan funds to Total Portfolio Balance

Add a **WITHDRAW TO TOTAL PORTFOLIO BALANCE** button to every active plan card on every dashboard. Clicking it ends the plan immediately — completed cycle or not — and moves both the locked capital and the accrued profit into the user's total portfolio balance.

## Behaviour

1. Button appears on each active plan (next to the activation-receipt button) and in the per-plan rows of the Portfolio Breakdown.
2. Clicking opens a confirmation dialog showing the exact amounts: locked capital, accrued profit, total to be credited, and a warning that the plan ends and stops earning.
3. On confirm:
   - Plan status becomes `withdrawn` (inactive) with a withdrawn timestamp, so it disappears from active plan lists and stops accruing ROI.
   - Locked capital + accrued profit are credited to the wallet balance in BTC at the current BTC price (principal was originally debited in BTC), so the Total Portfolio Value figure grows by exactly that amount.
   - A transaction record is written ("Plan cash-out — <plan name>: capital + profit to portfolio") so it shows in transaction history.
4. Dashboard refreshes live: active plan card disappears, Deposits available / Total Portfolio Value increase, Locked capital and Daily ROI earned drop accordingly.

## Accrued profit calculation

Profit uses the same source the dashboard already displays: the sum of rolled daily ROI rows for that investment when present, otherwise `principal x daily_roi x elapsed days`. The credited figure equals what the user sees on the card at the moment of confirmation.

## Technical details

- New security-definer function `withdraw_investment_to_portfolio(_investment_id uuid)`:
  - Verifies the caller owns the investment and it is `active` (locks the row).
  - Computes profit from `investment_daily_roi` (fallback to elapsed-days formula), total = principal + profit.
  - Converts USD total to BTC using `coin_prices` BTC price; upserts `wallet_balances` (BTC).
  - Sets `user_investments.status = 'withdrawn'`, `ends_at = now()`.
  - Inserts a `transactions` row (`type = 'plan_cashout'`, `to_symbol = 'BTC'`, status `completed`, notes with plan name and the capital/profit split).
  - Returns the credited USD and BTC amounts.
- `src/components/ActiveInvestmentCard.tsx`: add the button + confirm dialog, call the RPC, toast the result; the existing realtime subscription refreshes the list.
- `src/components/PortfolioBreakdown.tsx`: add the same action per plan row (needs the investment id already passed through) using a shared handler.
- No change to withdrawal-to-external-wallet flow, fees, or entitlements — this only moves funds internally.
