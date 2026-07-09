## Verify admin access for malcomhamish@gmail.com

Run an automated browser check against the live preview to confirm both the navbar Admin link and the /admin route work for this account.

### Steps

1. **Confirm DB state** — re-run a quick SQL check that `user_roles` still has `role = 'admin'` for user id `abb82cf2-3641-41eb-a2d1-ffa9e3bea313` (malcomhamish@gmail.com).
2. **Drive Playwright against `http://localhost:8080`**:
   - Go to `/auth`, sign in as malcomhamish@gmail.com (requires the account password — see question below).
   - Wait for redirect to `/wallet`.
   - Screenshot the navbar; assert the "Admin" link is visible (desktop nav + mobile sheet).
   - Click the Admin link, confirm URL is `/admin` and the Admin page renders without a redirect/permission error.
   - Capture console + network errors.
3. **Report** results with screenshots (navbar with Admin link, /admin page loaded).

### Blocker

I need the password for malcomhamish@gmail.com to sign in through the UI. Options:
- You paste the password (used once, not stored).
- Or you sign in yourself in the preview so the session is injected, and I verify using that session.

Which do you prefer?
