
## Goal

Let users buy investment plans directly from their dashboard using wallet funds, and redefine "Total Portfolio Value" so it shows **only unused external deposits + accrued daily-ROI profits from active plans** — never locked principal.

## 1. Redefine Total Portfolio Value (Wallet.tsx)

Currently `totalPortfolioValue = Σ(coin.balance × coin.price)`. This already excludes locked capital *if* we make sure the principal is debited from `wallet_balances` when a plan is purchased.

Change the displayed total to:

```
Total Portfolio Value = (wallet balances in USD) + (Σ accrued profit of active user_investments)
```

- Wallet balances = external unused funds (any coin).
- Accrued profit per investment = `amount × daily_roi × elapsed_days` (same formula already used in `ActiveInvestmentCard`).
- Locked principal is **never** added.

Fetch active investments in Wallet.tsx (same query the card uses) and compute a live-ticking total (1s interval like the card).

## 2. Purchase Plan flow

Add a **"Purchase Plan"** button next to Add Funds / Withdraw on the portfolio card. Opens a dialog:

- Dropdown of active `plan_templates` (name, min amount, daily ROI, duration).
- Principal input (validated against min/max and available USDT-equivalent wallet balance).
- Payment source: USDT balance (default). If insufficient USDT, allow BTC → auto-convert at current `coin_prices` rate.
- Confirm button:
  1. Debit `wallet_balances` (USDT, or BTC converted).
  2. Insert row into `user_investments` (status=active, started_at=now, ends_at=now+duration, daily_roi + amount copied from template).
  3. Insert a `transactions` row (`type='plan_purchase'`, `from_symbol='USDT'`, amount).
  4. Toast + refresh.

All done client-side with existing RLS (user owns their `wallet_balances`, `user_investments`, `transactions`).

## 3. Jeremy Element data cleanup

Jeremy's existing Recruit ($200 principal) and Inspectors ($500 principal) rows were created by admin seed while his wallet balances still contain that capital. To match the new rule "no capital in portfolio after purchase":

- Debit 0.01132353 BTC-equivalent of principal ($700 total) from his `wallet_balances` (deduct proportionally from BTC).
- Insert two `transactions` rows recording the plan purchases retroactively.

His portfolio will then show: remaining wallet ($315 from the $294+$21 leftover) + live accrued profits from both active plans.

## 4. Files to change

- `src/pages/Wallet.tsx` — new portfolio calc using active investments + accrued profit, new "Purchase Plan" button + dialog, updated `totalPortfolioValue`.
- `src/components/PurchasePlanDialog.tsx` — new component encapsulating the dialog.
- Data migration (insert tool) — Jeremy's wallet debit + `transactions` rows.

No schema changes, no new edge functions.

## Technical details

- Plan purchase is atomic-enough at the client level: sequential inserts within try/catch, roll back the debit if the investment insert fails.
- The ActiveInvestmentCard already renders per-plan principal + accrued profit, so users still see their locked capital there — it just no longer inflates the top-level "Total Portfolio Value".
- Realtime subscription on `user_investments` (already in ActiveInvestmentCard) can be reused via a shared hook or duplicated for the header total.
