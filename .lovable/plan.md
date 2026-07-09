## Secure Admin ROI Regulation Endpoint

Replace the client-side multi-update loop currently used by `RoiRegulator` with a single admin-only edge function that applies ROI changes atomically in one DB transaction.

### Why

Today the component fires N `UPDATE` statements from the browser via the anon-key client. Each row change is a separate request, so a mid-way failure leaves plans in a mixed state, and the operation relies purely on RLS (`has_role(auth.uid(),'admin')`) — with no server-side audit trail or invariant checks.

### New edge function: `admin-regulate-roi`

Path: `supabase/functions/admin-regulate-roi/index.ts`
- CORS + OPTIONS handler using `npm:@supabase/supabase-js@2/cors`.
- JWT validation via `getClaims(token)` (default `verify_jwt=false`, checked in code).
- Server-side admin check by calling the existing `has_role(_user_id, _role)` function with the service-role client. Non-admins → 403.
- Zod validation of body:
  ```ts
  { mode: "delta" | "multiply" | "set",
    value: number,
    activeOnly: boolean,
    propagateToActive: boolean }
  ```
- Atomic apply via a new SECURITY DEFINER Postgres function `public.regulate_daily_roi(...)` (see migration below) invoked with `supabase.rpc(...)`. All plan + investment updates happen in one transaction; on any error the whole thing rolls back.
- Response: `{ plansUpdated, investmentsUpdated, changes: [{id, name, oldRoi, newRoi}] }`.
- All responses (success + error) include `corsHeaders`.

### DB migration

New security-definer function `public.regulate_daily_roi(_mode text, _value numeric, _active_only boolean, _propagate boolean)`:
- `SECURITY DEFINER`, `SET search_path = public`.
- Re-checks `public.has_role(auth.uid(), 'admin')` — raises `exception 'not authorized'` otherwise (defense in depth even though the edge function already gates).
- Computes each plan's new ROI according to mode.
- Enforces invariants: `new_roi >= 0 AND new_roi <= 1`; raises on violation → aborts the whole transaction.
- Updates `plan_templates.daily_roi` for scoped rows.
- If `_propagate`, updates `user_investments.daily_roi` where `status='active'` and `template_id` in the scoped set.
- Returns JSON `{ plans_updated, investments_updated, changes }`.
- `GRANT EXECUTE ... TO authenticated;` so the JWT-scoped edge function call carries admin identity.

New audit table `public.roi_regulation_log` (small, admin-only):
- Columns (domain-specific): `admin_user_id`, `mode`, `value`, `active_only`, `propagate`, `plans_updated`, `investments_updated`, `changes` (jsonb).
- Standard `id`, `created_at`.
- GRANTs: `SELECT` to `authenticated` (readable by admins via policy), `ALL` to `service_role`.
- RLS enabled. Policies: `SELECT` for `has_role(auth.uid(),'admin')`; `INSERT` only via the security-definer function (no direct client insert policy).
- The `regulate_daily_roi` function inserts one row per successful invocation.

### Frontend changes (`src/components/admin/RoiRegulator.tsx`)

- Replace the two `Promise.all` update loops with a single `supabase.functions.invoke("admin-regulate-roi", { body: {...} })` call.
- Use the response's `plansUpdated` / `investmentsUpdated` in the success toast.
- Keep the existing preview UI, presets, confirm dialog, and 0–100% client-side guardrails (server also enforces).
- No change to how templates list is refreshed (realtime + `onApplied`).

### Files touched

- New: `supabase/functions/admin-regulate-roi/index.ts`
- New migration: adds `regulate_daily_roi` function + `roi_regulation_log` table with grants, RLS, policies.
- Edited: `src/components/admin/RoiRegulator.tsx` — swap direct DB writes for edge-function call.
- No changes to `AdminPlans.tsx`, `supabase/config.toml`, or other components.

### Out of scope

- No UI to browse the audit log (data is captured; a viewer can come later).
- No scheduled/deferred application.
- No changes to per-plan edit dialogs — those keep writing directly (already admin-gated by RLS).

Approve and I'll implement.