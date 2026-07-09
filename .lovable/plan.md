# Add Admin Link to Main Navigation

## Goal
Create a persistent, role-aware navigation bar that appears across all routes and shows an **Admin** link only to users with the `admin` role.

## Current State
- There is no shared navigation component; each page builds its own header/buttons.
- The Wallet page already checks `user_roles` for `admin` and shows an "Admin Panel" button inline.
- Admin routes (`/admin`, `/admin/plans`, `/admin/withdrawals`, `/admin/redemptions`) are gated server-side by RLS and client-side by role checks.

## Proposed Changes

### 1. New `Navbar` component
Create `src/components/Navbar.tsx` with:
- Brand link to `/`.
- Auth-aware navigation items:
  - Public: Home, Investment Plans, Crypto Cards, Redeem, Sign In.
  - Authenticated: Wallet, Trade, Transactions, Chat, Leaderboard, Simulator, Sign Out.
  - Admin-only (conditional): **Admin** link with a distinct style (Shield icon, accent/primary emphasis).
- Mobile hamburger menu using the existing `Sheet` component.
- Role check queries `user_roles` for the current user's `admin` role, cached via React Query or local state.

### 2. Layout wrapper in `App.tsx`
- Introduce a `Layout` component that renders `<Navbar />` above `<Outlet>` (or wrap routes in `App.tsx` if using `react-router-dom` v6 with `BrowserRouter`).
- Apply the layout to all routes so the navbar is visible everywhere.
- Keep the navbar sticky at the top with a blurred background (`bg-background/80 backdrop-blur-md`).

### 3. Clean up redundant buttons
- Remove the duplicate "Admin Panel" button from the Wallet page header (and any other page that has an inline admin button) since it will now live in the navbar.
- Keep page-specific actions (e.g., "Add Funds", "Withdraw", "Trading Simulator") untouched.

### 4. Styling
- Use semantic tokens from `index.css` (`bg-background`, `text-foreground`, `primary`, `accent`, `muted-foreground`).
- Active route highlight via `NavLink` or `useLocation`.
- No hardcoded colors; follow the existing dark-first theme.

## Files to Change
- `src/components/Navbar.tsx` (new)
- `src/App.tsx` (add layout wrapper)
- `src/pages/Wallet.tsx` (remove inline Admin Panel button)

## Out of Scope
- No backend changes; role checks reuse the existing `user_roles` table and RLS.
- No changes to the Admin page's own internal access checks.
- No new dependencies; use existing `lucide-react`, `@/components/ui`, and React Router.

## Verification
- Build passes (`bun run build` or `tsc --noEmit`).
- Preview shows the navbar on `/`, `/wallet`, `/trade`, etc.
- Admin link is hidden for non-admin users and visible for admin users.
- Mobile sheet menu opens/closes correctly.