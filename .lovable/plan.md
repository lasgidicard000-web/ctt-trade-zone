## Change
Insert a new active investment row for Jeremy Element (`b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5`) using the Inspectors Plan template.

Row values:
- `user_id`: b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5
- `template_id`: 14c18282-f9e3-42f3-a162-aa0c7ed28692
- `plan_id`: `inspectors`
- `plan_name`: `Inspectors Plan`
- `amount`: 500 (per your instruction — note the template's stated min is $1,000; overriding for this manual activation)
- `daily_roi`: 0.03 (3%/day, from template)
- `duration_days`: 45 (from template)
- `status`: `active`
- `started_at`: now()
- `ends_at`: now() + 45 days

## Result
Jeremy's dashboard `ActiveInvestmentCard` will immediately show the Inspectors Plan running alongside the existing Recruit Plan, with live daily ROI accrual, progress bar, and days remaining — all standard features already wired to `user_investments`.

No code changes required.
