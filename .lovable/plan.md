## Goal
Give admins a single place to (1) manage recruit plan templates and (2) assign plans to users.

## 1. New table: `plan_templates`
Columns:
- `name` (e.g. "Recruit Plan", "Inspectors Plan")
- `coin` — payout/deposit coin: `BTC` | `ETH` | `USDT` | `USDC` | `BNB` | `SOL`
- `principal_min`, `principal_max` — allowed principal range (USD)
- `daily_roi` — e.g. `0.01` for 1% / day
- `duration_days`
- `is_active` — inactive plans hidden from assignment dropdowns but preserved on existing investments
- `sort_order`, `description`

Access:
- Anyone authenticated can read active templates (used by `/investment-plans`).
- Only admins can insert / update / delete.

Seed the 5 existing tiers (Recruit, Inspectors, Superintendent, Commissioners, General) so nothing regresses.

## 2. Link `user_investments` → `plan_templates`
Add nullable `template_id uuid references plan_templates(id)`. Keep existing `plan_id` / `plan_name` / `daily_roi` / `duration_days` columns as a snapshot so past investments stay correct if a template is edited later.

## 3. Admin page: `/admin/plans`
New route, admin-guarded (same pattern as `/admin`). Two tabs:

### Tab A — Plan Templates
Table: Name · Coin · Principal range · Daily ROI · Duration · Status · Actions.
- "New plan" button → dialog (name, coin select, min/max principal, daily ROI %, duration days, active toggle, description).
- Row actions: Edit, Toggle active/inactive, Delete (confirm; blocked with toast if any `user_investments` reference it — offer deactivate instead).

### Tab B — User Assignments
Table of all `user_investments` joined with profile display name: User · Plan · Principal · Daily ROI · Started · Ends · Status · Actions.
- "Assign plan" button → dialog:
  - User search (reuses profile lookup pattern from `AdminUserManagement`)
  - Plan template select (active only) — auto-fills coin/ROI/duration
  - Principal amount (validated against template min/max)
  - Start date (shadcn date picker, defaults today) → `ends_at` computed
  - Submit inserts a row into `user_investments` with snapshotted fields + `template_id`.
- Row actions: mark Completed, Cancel, Delete.

Add "Plans" link to the existing admin nav.

## 4. Deposit approval integration
In `AdminDepositManagement`, when approving a deposit add an optional "Also activate a plan" section: plan template select + principal (prefilled with deposit amount). On approve, if selected, insert the matching `user_investments` row in the same action.

## 5. UX / realtime
- Realtime subscription on `plan_templates` and `user_investments` so the admin page updates live.
- `/investment-plans` (user-facing) switches to read from `plan_templates` instead of hardcoded array so admin edits show up immediately.
- `ActiveInvestmentCard` unchanged — it already reads from `user_investments`.

## Technical notes
- Migration: `CREATE TABLE public.plan_templates`, GRANTs for `authenticated` (select) and `service_role` (all), RLS with `has_role(auth.uid(),'admin')` for write, `is_active = true` for public select. `ALTER TABLE user_investments ADD COLUMN template_id uuid REFERENCES plan_templates(id)`. Update trigger for `updated_at`. Seed 5 tiers.
- Files: `src/pages/AdminPlans.tsx`, `src/components/admin/PlanTemplatesTable.tsx`, `src/components/admin/PlanTemplateDialog.tsx`, `src/components/admin/UserInvestmentsTable.tsx`, `src/components/admin/AssignPlanDialog.tsx`. Route in `App.tsx`. Small edit to `AdminDepositManagement.tsx` and `InvestmentPlans.tsx`.
- All admin mutations gated by `has_role` RLS — no client-side trust.

## Out of scope
- Auto-payout when `ends_at` passes.
- Editing an already-assigned investment's principal/ROI (admin can cancel + reassign).
