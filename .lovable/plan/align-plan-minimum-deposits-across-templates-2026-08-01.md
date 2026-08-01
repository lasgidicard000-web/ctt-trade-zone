# Align plan minimum deposits across templates

The Investment Plans page already shows the requested minimums (Recruit $200, Inspectors $500, Superintendent $1,000, Commissioners $2,000, General $5,000). The database plan templates that drive purchases and admin assignment currently differ: Commissioners starts at $5,000 and General at $10,000.

## Data update (plan_templates)

Set contiguous, non-overlapping ranges so every amount maps to exactly one plan:

| Plan | Minimum | Maximum |
| --- | --- | --- |
| Recruit Plan | 200 | 499 |
| Inspectors Plan | 500 | 999 |
| Superintendent Plan | 1,000 | 1,999 |
| Commissioners Plan | 2,000 | 4,999 |
| General Plan | 5,000 | 1,000,000 |

Daily rates, durations and active flags stay unchanged.

## Effect

- Purchase Plan dialog and Admin Plans assignment validate against the new ranges automatically.
- The Commissioners top-up banner on the wallet dashboard reads its requirement from the template, so it will show $2,000 required and recompute the shortfall.
- Existing active investments are untouched.

## Technical notes

Single data update against `public.plan_templates` (no schema change, no code change).
