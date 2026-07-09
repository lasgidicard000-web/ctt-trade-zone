## Bulk Daily ROI Regulator

Add a new admin control on `src/pages/AdminPlans.tsx` (Plan Templates tab) that lets you adjust the daily ROI across all investment plans at once — without having to edit each plan template row individually.

### UI

New card at the top of the Templates tab: **"Regulate Daily ROI"**.

Contents:
- Quick preset buttons: `-0.5%`, `-0.1%`, `+0.1%`, `+0.5%`, `+1%` (applied as absolute percentage-point deltas).
- Custom input: number field (accepts negative) + mode selector:
  - **Add / subtract** percentage points (e.g. `+0.25` → every plan's daily ROI increases by 0.25 pp).
  - **Multiply** by a factor (e.g. `1.10` → all ROIs increase by 10% relative).
  - **Set all to** a fixed daily ROI %.
- Scope checkboxes:
  - "Only active plans" (default on).
  - "Also update currently active user investments" (default off) — when on, applies the same change to `user_investments.daily_roi` where `status = 'active'`.
- Live preview table: each plan's current ROI → new ROI, with clamping to `0%` minimum and `100%` maximum daily.
- **Apply** button opens a confirm dialog summarizing: N plans affected, M active investments affected (if scope on).

### Behavior

- Apply runs updates through the existing Supabase client using the current admin session (RLS already allows admins to update `plan_templates` and `user_investments`).
- Update plans one-by-one in a `Promise.all` loop (small N, ~5 rows); same for user investments if scope selected.
- After success: toast "ROI updated for X plans (Y investments)", refresh both lists via the existing `loadTemplates` / `loadInvestments` (already wired to realtime).
- Guardrails:
  - Refuse to apply if any resulting ROI would be negative or > 100%/day.
  - Confirm dialog required before applying.
  - No effect on completed/cancelled investments.

### Files touched

- `src/pages/AdminPlans.tsx` — add the new card + state + apply handler. No new files, no DB migration (schema already supports it, RLS already correct).

### Out of scope

- No audit log / history table for ROI changes (can be added later if you want).
- No scheduling ("apply next Monday") — immediate only.
- No per-plan multi-select — this is bulk across all (or all active) plans.

Confirm and I'll build it. If you'd prefer a different scope (e.g. audit history, or per-plan multi-select instead of all-plans bulk), tell me now.