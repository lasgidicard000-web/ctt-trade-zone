# Admin ROI Audit Page

Add a read-only page that shows the history of ROI regulation actions logged in `roi_regulation_log`.

## UI

New route `/admin/roi-audit` (page `src/pages/AdminRoiAudit.tsx`), gated by admin role like other admin pages.

Layout:

```text
[ Header: ROI Regulation Audit | Refresh | Export CSV ]
[ Filters: date range | mode (delta/multiply/set) | propagate yes/no ]
[ Table:
  Timestamp | Admin email | Mode | Value | Scope (active only) |
  Plans updated | Investments updated | Propagated | Details ▸
]
[ Expandable row → JSON diff of `changes` (plan name, oldRoi → newRoi) ]
```

- Empty state when no rows.
- Newest first, paginated (25/page).
- Click a row to expand and see the per-plan `changes` array in a readable list, not raw JSON.

## Data

Read from existing `roi_regulation_log` (already populated by `regulate_daily_roi`). Columns used: `created_at`, `admin_user_id`, `mode`, `value`, `active_only`, `propagate`, `plans_updated`, `investments_updated`, `changes`.

Admin email is not stored on the log. Two options — I'll go with **A** unless you prefer B:

- **A (default):** New edge function `admin-roi-audit` (JWT + `has_role(admin)` gate) that joins log rows to `auth.users.email` server-side and returns the enriched list. Keeps `auth.users` off the client.
- B: Add `admin_email` column to `roi_regulation_log` and backfill; simpler client, schema change.

## Navigation

- Add a "ROI Audit" link/tab in `src/pages/Admin.tsx` next to the existing ROI regulator, linking to `/admin/roi-audit`.
- Register the route in `src/App.tsx`.

## Files

- **New:** `src/pages/AdminRoiAudit.tsx`
- **New:** `supabase/functions/admin-roi-audit/index.ts` (option A)
- **Edited:** `src/App.tsx` — add route
- **Edited:** `src/pages/Admin.tsx` — add link to audit page

## Out of scope

- Editing/deleting log entries (audit is immutable).
- Reverting a past ROI regulation (separate feature).

Confirm and I'll build it.
