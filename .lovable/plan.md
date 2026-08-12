# Admin Cloud Console at /admin/cloud

A single admin-only page that surfaces everything from the backend — database, users, storage, functions/logs/email, plus a live-support panel — with edit and delete on data rows, all audited.

## Page layout

`/admin/cloud`, linked from the admin nav and from the existing `/admin` dashboard. Admin-role guarded (non-admins get redirected). Five tabs:

### 1. Database
- Left list of every public table (row counts, column count), searchable.
- Right pane: paginated row grid for the selected table with column search, sort, and a text filter across searchable columns.
- Row actions: inline edit (form built from the real column types), delete with confirm, and duplicate.
- Export current view to CSV.
- Every write is written to the admin audit log with before/after JSON.

### 2. Users & auth
- Full user list: email, display name, roles, created date, last sign-in, confirmed status.
- Actions: grant/revoke admin role, send password reset, send magic link, ban/unban, delete user (typed confirmation).
- Click a user to see their balances, investments, cards, deposits and withdrawals in one drawer.

### 3. Storage
- Bucket list (`gift-card-screenshots`, `database_export_09_07_26`) with file browser: name, size, type, last modified.
- Actions: preview/download via short-lived signed URL, upload, delete file.

### 4. Functions, logs & email
- List of deployed edge functions with last-invocation status and a recent-log viewer per function.
- Email send log (recipient, template, status, error) with filters, plus queue state (retry-until, batch size, delays) and the suppression list.
- Read-only, with a "resend" shortcut for failed transactional emails.

### 5. Live support (Tawk.to)
- Embedded Tawk.to dashboard link plus the visitor-monitoring widget so admins can see and chat with current site visitors from this page.
- Quick reference of the support inboxes and a shortcut to `/admin/webmail` for follow-up email.
- Requires your Tawk.to property/widget ID; if it isn't already in the codebase I will ask for it before wiring the embed.

## Safety

- Everything routes through one new admin-only edge function that verifies the caller's admin role server-side; the browser never gets a service key.
- Table and column names are validated against the real schema (allow-list), never interpolated from raw client input.
- Protected tables (`user_roles`, `admin_transaction_log`, audit logs) are read-only in the grid; role changes go through the dedicated Users tab so they stay audited.
- Delete on any row asks for confirmation and records who did it and what the row contained.

## Technical notes

- New `admin-cloud` edge function with actions: `list-tables`, `list-rows`, `update-row`, `delete-row`, `insert-row`, `list-users`, `user-action`, `storage-list`, `storage-signed-url`, `storage-delete`, `function-logs`, `email-log`. Zod-validated input, admin check via `has_role`, service-role client for reads/writes, writes mirrored into `admin_transaction_log`.
- Reuses the existing `admin_list_tables()` function for schema introspection.
- New page `src/pages/AdminCloud.tsx` plus components under `src/components/admin/cloud/` (TableBrowser, RowEditor, UsersPanel, StoragePanel, LogsPanel, SupportPanel).
- Route added in `src/App.tsx`; nav link added in `src/components/Navbar.tsx` behind the admin role check.
- No schema migration needed unless the audit log needs an extra column; existing tables cover it.
