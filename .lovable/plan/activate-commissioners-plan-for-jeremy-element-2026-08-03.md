# Activate Commissioners Plan for Jeremy Element

Jeremy's available portfolio is 0.02083587 BTC (~$1,322.99 at $63,496.12/BTC). He already runs Recruit ($200), Inspectors ($500) and Superintendent ($1,000) plans. The Commissioners Plan normally requires a $2,000 minimum — this is an approved admin override at the full available balance.

## Data changes

1. **Debit the wallet**: set BTC balance to 0 (the full 0.02083587 BTC, ~$1,322.99, is used as principal).
2. **Create the investment** in `user_investments`:
   - Plan: Commissioners Plan (`commissioners`), template `da171c08-...`
   - Principal: $1,322.99
   - Duration: 75 days, ROI band 2.34%–5.46%/day
   - Status: active, starting now, ending 75 days out
3. **Log a transaction** (`plan_purchase`, from BTC, completed) and an admin audit entry with before/after balances and the override reason.
4. **Roll daily ROI** for the new investment so today's rate shows immediately on the dashboard.

## Features that switch on automatically

Commissioners entitlements (tier rank 4) are already defined and read live by the dashboard:

- Withdrawal fee drops to 0.3%
- Daily withdrawal cap rises to $75,000
- Priority support, premium features and community access enabled
- Cyan Commissioners badge on the entitlements card
- Top-up banner on the wallet dashboard flips to "Commissioners Plan active"
- Pending CTT debit card moves to "PENDING — ACTIVATING" with the 24-hour issuance countdown

## Technical notes

Data-only change (no schema, no code): one update to `wallet_balances`, inserts into `user_investments`, `transactions`, `admin_transaction_log`, then `roll_investment_daily_roi()`. Available portfolio afterwards reads $0 plus accruing ROI, with $3,022.99 total locked principal across four plans.
