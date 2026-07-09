## Goal
Give admins a dedicated, obvious way to grant and revoke the **admin** role from the User Management tab in the Admin Panel.

## What exists today
The Admin Panel already has a "User Management" tab (`src/components/AdminUserManagement.tsx`) that lists profiles and lets you add/remove any role via dialogs. It works but:
- The admin action is buried behind a generic "Add Role" → select → confirm flow.
- You can only search by display name or partial user id — no email lookup.
- There's no clear visual distinction for who is currently an admin.

## Changes

### 1. Dedicated "Grant/Revoke Admin" control
In `AdminUserManagement.tsx`, add a prominent per-row action:
- If the user is NOT an admin → **"Make Admin"** button (shield icon, primary style).
- If the user IS an admin → **"Revoke Admin"** button (destructive style).
- Clicking opens a small confirm dialog naming the user and the action.
- Keep the existing generic Add/Remove Role controls for moderator/user roles (secondary placement).
- Preserve the existing safeguard: an admin cannot revoke their own admin role (button disabled with tooltip).

### 2. Better identification of users
- Add an **Admin** column/badge so admins are visually distinct at a glance.
- Add a filter toggle: **All / Admins only**.
- Extend search to also match email. Because `profiles` does not store email, add a small Edge Function `admin-list-users` (service-role) that returns `{ user_id, email, display_name, is_admin }` for all users. The tab will call this function instead of querying `profiles` + `user_roles` directly. Access is gated by `has_role(auth.uid(), 'admin')` inside the function.

### 3. Navigation
The Admin tab is already reachable from the navbar for admins. No routing changes; this remains inside `/admin` under the "User Management" tab. Optionally surface a shortcut card on the Admin landing that deep-links to that tab.

## Technical notes
- New Edge Function: `supabase/functions/admin-list-users/index.ts` — verifies caller is admin, then uses `supabase.auth.admin.listUsers()` + a join on `user_roles` to return the enriched list. No DB migration needed.
- Grant/revoke still writes directly to `public.user_roles` via the client (existing RLS policies already allow admins to manage roles).
- React Query cache key `usersWithRoles` is invalidated after each mutation so the UI reflects role changes immediately.
- No schema changes, no new dependencies.

## Out of scope
- Creating/deleting user accounts.
- Editing profile fields (display name, avatar, etc.).
- Bulk role operations.
