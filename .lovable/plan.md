## Goal
Add backend entitlements so the Inspectors Plan (and other tiers) grants concrete, enforceable perks. Jeremy's active Inspectors row will immediately unlock these perks with no per-user hardcoding.

## Entitlements Matrix (tier → perks)
| Tier | Withdrawal fee | Daily withdrawal cap | Priority support badge | Premium features | Community access |
|---|---|---|---|---|---|
| None | 1% (min $1) | $2,000 | — | — | — |
| Recruit | 1% | $5,000 | — | — | — |
| **Inspectors** | **0.5%** | **$15,000** | **Yes (silver)** | **Yes** | **Yes** |
| Superintendent | 0.4% | $30,000 | Yes (gold) | Yes | Yes |
| Commissioners | 0.3% | $75,000 | Yes (cyan) | Yes | Yes |
| General | 0.25% | $250,000 | Yes (purple) | Yes | Yes |

## Backend Changes

### 1. Database (single migration)
- `plan_entitlements` table — one row per `plan_id` holding: `withdrawal_fee_pct`, `daily_withdrawal_cap`, `priority_support` (bool), `premium_features` (bool), `community_access` (bool), `badge_color`. Seed the 5 tiers above. Public `SELECT` (needed by client to display badges/limits).
- `public.get_user_entitlements(_user_id uuid)` — SECURITY DEFINER, STABLE. Returns the highest-tier active `plan_entitlements` row for the user (based on `user_investments.status = 'active'` and `ends_at > now()`), or the "none" default row. Used by both edge functions and the client.
- `public.has_active_plan(_user_id uuid, _plan_id text)` — SECURITY DEFINER boolean. Used by RLS/policies where a specific tier is required.
- `GRANT EXECUTE` on both functions to `authenticated` and `service_role`.

### 2. Edge function: `process-withdrawal`
Replace the hardcoded `WITHDRAWAL_FEE_PERCENTAGE` and add a daily cap check:
- On `request-withdrawal`, call `get_user_entitlements(user.id)` and use its `withdrawal_fee_pct` for the fee calc (min $1 floor stays).
- Sum today's `withdrawals.amount` for the user; reject if `today + amount > daily_withdrawal_cap`.
- Error messages surface the active tier so users see why the cap applies.

### 3. New edge function: `community-access`
Single endpoint the client calls when Jeremy taps "Join CTT Community":
- Verifies caller has `community_access = true` via `get_user_entitlements`.
- Returns the invite links (Telegram / WhatsApp / Discord — placeholders in the function, easy for you to swap). Non-eligible users get a 403 with the required tier list.

### 4. Client wiring (minimal, presentation only)
- `useEntitlements(userId)` hook — reads `get_user_entitlements` via RPC + realtime refresh on `user_investments` changes.
- `ActiveInvestmentCard` / dashboard: show the tier badge color, fee %, daily cap, and a "Join CTT Community" button that calls the `community-access` function when `community_access` is true.
- Withdrawal form (`Wallet` page): display the entitlement-derived fee and remaining daily cap; no logic change (server is source of truth).

## Result for Jeremy Element (`b12f35e2-…`)
Because his Inspectors Plan is already active, the moment this ships he will:
- Pay 0.5% withdrawal fees (down from 1%) with a $15,000 daily cap.
- See a silver "Inspectors" badge on his dashboard and be flagged priority in future support routing.
- See the premium-features flag turn on (ready for you to gate any future UI on it).
- Get access to the "Join CTT Community" button returning the invite links.

No user-specific hardcoding — same rules apply to any user who activates Inspectors or higher.

## Technical Notes
- Migration must include `GRANT SELECT ON public.plan_entitlements TO anon, authenticated` and `GRANT ALL TO service_role`, plus `ENABLE ROW LEVEL SECURITY` with a public-read policy (rows are non-sensitive config).
- Both new functions use `SET search_path = public` and `SECURITY DEFINER`, following the existing `has_role` pattern.
- `process-withdrawal` keeps all current validations (address format, min $10, USDT balance). Only fee source and new daily-cap check are added.
- Community invite URLs will be placeholders in the edge function — reply with the real links after approval and I'll drop them in.
