## Admin Table Viewer

A new admin-only page inside the app that lists every table in the `public` schema and lets admins browse and edit rows — like a lightweight Supabase Table Editor built into your app.

### Access
- Route: `/admin/tables`
- Gated by existing `has_role(auth.uid(), 'admin')`. Non-admins get redirected.
- Link added inside the existing Admin navigation area (not the public navbar).

### Layout
- Left sidebar: alphabetical list of all `public` tables (auto-discovered), with a filter box.
- Main area: selected table shown as a data grid.
  - Column headers with type hints (text, uuid, int, jsonb, timestamp, bool).
  - Pagination (50 rows/page) with page number + total count.
  - Sort by any column (asc/desc).
  - Simple per-column filter row (equals / contains / is null).
  - Refresh button.

### Editing
- **Edit row**: click a row → side drawer with a form field per column. Primary key and `created_at` are read-only. `updated_at` auto-updates via existing triggers where present.
- **Insert row**: "New row" button opens the same drawer empty; nullable/default columns can be left blank.
- **Delete row**: row action with a typed confirmation ("delete") to avoid accidents.
- JSON/JSONB columns edited in a monospace textarea with parse validation.
- All writes go through the standard Supabase JS client, so **existing RLS policies apply**. Admins already have broad policies on most tables via `has_role`; anything the policies forbid will surface as an error toast — no policy changes in this plan.

### How table discovery works
- A new SECURITY DEFINER RPC `admin_list_tables()` returns table names + columns (name, data_type, is_nullable, is_identity, default) from `information_schema`, filtered to schema `public`. The function itself checks `has_role(auth.uid(), 'admin')` and returns empty otherwise. No `information_schema` exposure to non-admins.
- No new tables. No policy changes. One new function + grant to `authenticated`.

### Out of scope (say if you want them added)
- Custom SQL runner
- Audit log of admin edits
- Foreign-key aware pickers (you'll edit FK columns as raw UUIDs/text)
- Bulk import/export from this page (use existing Cloud export for full dumps)

### Files (technical)
- Migration: `admin_list_tables()` function + `GRANT EXECUTE ... TO authenticated`.
- `src/pages/admin/AdminTables.tsx` — page shell, sidebar, grid.
- `src/components/admin/tables/TableGrid.tsx` — data grid + pagination/sort/filter.
- `src/components/admin/tables/RowDrawer.tsx` — edit/insert form.
- `src/hooks/useAdminTable.ts` — fetch rows, mutate row, list tables.
- Route registered in the existing admin route group; nav link added to the admin menu.
