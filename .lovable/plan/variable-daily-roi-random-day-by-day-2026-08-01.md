# Variable Daily ROI (Random, Day-by-Day)

Today every plan pays a single fixed daily rate (Recruit 1.5%, Inspectors 1.9%, Superintendent 3.2%, Commissioners 3.9%, General 4.8%) and dashboards accrue `principal x rate x days elapsed`. This change makes each day's ROI vary within a per-plan band, so earnings differ every day like real market performance.

## How it will work

- Each plan gets a performance band instead of one number (defaults centred on today's rates):
  - Recruit: 0.9% - 2.1% (avg ~1.5%)
  - Inspectors: 1.2% - 2.6% (avg ~1.9%)
  - Superintendent: 2.2% - 4.2% (avg ~3.2%)
  - Commissioners: 2.7% - 5.1% (avg ~3.9%)
  - General: 3.4% - 6.2% (avg ~4.8%)
- Once a day, the system rolls a random rate inside the band for every active investment and stores it as that day's ROI. Past days are never re-rolled, so history stays stable and consistent for every user.
- Earnings become the sum of the stored daily rates (plus a live intraday portion for today), instead of a flat multiplication.
- Admin keeps full control: the ROI regulator can shift or scale the bands, and an admin can override a specific day's rate if needed.

## What changes on screen

- Active Investment card: "Daily ROI" becomes "Today's ROI" with the actual rolled value, plus the plan's band and an average-so-far figure. Accrued profit still ticks live.
- Portfolio Breakdown: per-plan row shows today's rate and average rate to date; earned totals use the real daily history.
- Investment Plans page: plan cards show the performance band (no single fixed percentage). Estimator uses the band's average — already band-based, so only wiring changes.
- Admin Plans: template editor gains min/max ROI fields; a per-investment daily ROI history table with an edit action.

## Technical notes

- Migration: add `roi_min` / `roi_max` to `plan_templates` (backfilled from current `daily_roi` +/- 40%); new table `investment_daily_roi` (investment_id, user_id, roi_date, roi, source: auto/admin) with grants, RLS (owner read, service_role/admin write) and a unique key on (investment_id, roi_date).
- New edge function `roll-daily-roi` scheduled via pg_cron (hourly, idempotent): for each active investment, inserts missing daily rows from `started_at` up to today using a random value in the plan band; `ON CONFLICT DO NOTHING` so re-runs are safe.
- A security-definer function `get_investment_roi_summary(...)` (or a view) returns per-investment: today's roi, average roi, total accrued, day count — used by the dashboard components so the client does not recompute from raw fixed rates.
- `daily_roi` on `user_investments` stays as the fallback/average value so existing rows, `regulate_daily_roi`, entitlements and `PurchasePlanDialog` keep working; purchase writes the band midpoint there.
- `regulate_daily_roi` extended to move `roi_min`/`roi_max` alongside `daily_roi`, still logged in `roi_regulation_log`.
- Accrual for today is prorated by hours elapsed so the live ticker stays smooth and never exceeds the day's rolled rate.
