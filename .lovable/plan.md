## Why debit/credit is failing

The `admin-transactions` edge function logs show every call rejected with `Error: not authenticated` at line 32 (`auth.getUser()`). That's why the Manual Balance Adjustment (and every Edit / Set-status / Reverse / Delete action in Admin Transactions) fails — the request never gets past the auth check to run `admin_apply_transaction_action`.

Root cause: the function builds a Supabase client with `SUPABASE_ANON_KEY` and forwards the browser's `Authorization` header to `auth.getUser()`. On this project the anon/publishable + signing-keys setup means that legacy path doesn't validate the JWT reliably from inside the function, so `getUser()` returns no user and we throw.

## Fix plan

1. **Rewrite auth in `supabase/functions/admin-transactions/index.ts`:**
   - Strip the `Bearer ` prefix from the incoming `Authorization` header to get the raw access token.
   - Build the admin (service role) client first, then call `admin.auth.getUser(token)` to resolve the user from the token directly — this is the pattern that works with signing keys and doesn't depend on the anon client.
   - Keep the `has_role(user.id, 'admin')` check and the rest of the flow unchanged.
   - Return a 401 (instead of 400) with a clear message when the token is missing/invalid, so the UI toast is accurate.

2. **Redeploy the `admin-transactions` edge function** and re-test:
   - Manual Balance Adjustment (credit + debit)
   - Edit amount/hash/notes, Set status, Reverse, Delete from `/admin/transactions`

3. **No database, RLS, or frontend changes.** The SQL function, grants, and client `supabase.functions.invoke(...)` calls are already correct — this is purely an edge-function auth bug.

### Files touched
- `supabase/functions/admin-transactions/index.ts` (edit)

### Out of scope
- Any UI/UX changes to the Admin Transactions page.
- Changes to `admin-roi-audit` or other edge functions (they use their own auth code and aren't reporting this error).