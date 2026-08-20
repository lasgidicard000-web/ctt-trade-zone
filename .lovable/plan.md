# Make Wyatt's dashboard figures identical to Jeremy Element's

Verified current state:

```text
Balances     Jeremy 0.05454236 BTC / 0.00 USDT   Wyatt 0.05454236 BTC / 0.00 USDT  (already match)
Transactions Jeremy 20                           Wyatt 20                          (already match)
Plans        Jeremy: Commissioners Plan $2,000 active (75 days, 18 rolled ROI days)
             Wyatt:  Superintendent $1,031 active + General Plan $5,000 active
```

So the only remaining difference driving the dashboard cards (Total Portfolio Value, Deposits available, Daily ROI earned, Locked capital, BTC balance/USD) is the plan set.

## Data changes (data only, no code)

1. **Retire Wyatt's plans**: mark the active Superintendent Plan ($1,031) and General Plan ($5,000) as `withdrawn` with an end timestamp of now, so they leave the active list, stop accruing, and no longer count toward locked capital. Their historical daily-ROI rows stay as record.
2. **Clone Jeremy's Commissioners Plan onto Wyatt**: same plan id/name, principal $2,000.00, daily ROI 0.60%, 75 days, status active, same `started_at` (2026-08-03) and `ends_at` (2026-10-17) so cycle progress reads identically.
3. **Copy the ROI catalog**: copy all 18 `investment_daily_roi` rows from Jeremy's Commissioners investment to Wyatt's new investment (same dates, same daily rates), so "Daily ROI earned", today's rate, and the per-plan average match to the cent.
4. **Audit entry**: log the whole operation in the admin audit log with before/after snapshots and a reason noting the account mirror.

Jeremy's own account is untouched.

## Result

Both dashboards then show: BTC 0.05454236 and the same USD value, the same Deposits available, the same Locked capital ($2,000), the same Daily ROI earned, the same Commissioners tier entitlements and badge, and the same transaction/deposit history. Remaining differences: username, email, login credentials and admin rights.
