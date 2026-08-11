# Top up Jeremy's Commissioners Plan to exactly $2,000

Jeremy's Commissioners Plan is currently running at **$1,322.99** principal (active, ends 17 Oct 2026). His available portfolio balance is **0.04365998 BTC (~$2,772.14)** at the current BTC price of $63,496.12.

To land on an exact $2,000 principal, the top-up is **$677.01** (not $678) — that is the precise shortfall.

## Data changes

1. **Debit the wallet**: remove 0.01066223 BTC (= $677.01) from the BTC balance, leaving 0.03299775 BTC (~$2,095.13) available.
2. **Increase the plan principal**: `user_investments` Commissioners row amount 1322.99 to 2000.00 (status, ROI band, start and end dates unchanged, so accrued ROI history stays intact).
3. **Log a transaction**: `plan_purchase` type, from BTC, completed, noting "Commissioners Plan top-up: $677.01 added to reach $2,000 principal".
4. **Admin audit entry** with before/after principal and before/after BTC balance.

## What the dashboard shows afterwards

- Commissioners Plan card: locked capital $2,000.00, daily ROI applied to the new principal
- Available portfolio balance drops by $677.01
- Top-up entry visible in transaction history
- Entitlements unchanged (already Commissioners tier 4: 0.3% withdrawal fee, $75,000 daily cap, active CTT card)

## Technical notes

Data-only change: one `wallet_balances` update, one `user_investments` update, one `transactions` insert, one `admin_transaction_log` insert. No schema or code changes. Daily ROI rows already rolled stay attached to the same investment id; future ROI accrues on the $2,000 principal.
