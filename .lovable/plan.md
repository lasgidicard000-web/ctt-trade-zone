# New General-member portrait + dark premium dashboard

## 1. Replace Jeremy's portrait

The uploaded photo (navy shirt, six gold plan shields including the GENERAL PLAN crown badge) becomes his member portrait everywhere it appears — the Member Profile Card on the wallet dashboard and the General dashboard header.

- Upload the new image to the CDN and point `src/assets/jeremy-portrait.png.asset.json` (plus a compact avatar variant) at it.
- Update Jeremy's stored `profiles.avatar_url` to the new CDN URL so the card loads it immediately; the "Change photo" upload flow is untouched.
- Remove the old portrait asset once nothing references it.

## 2. Stylish dark General-member dashboard

`/general` gets a dedicated premium dark treatment, distinct from the standard wallet page:

- Deep near-black navy canvas with gold accents matching the General shield, subtle radial glow behind the header and a soft grain/gradient overlay.
- Header: large portrait in a gold ring, name, gold "General Plan · Tier 5" crown badge, and the equity/ROI figures on glassy dark panels.
- All cards (entitlements, active plans, spend-card merchants, debit card, referral) restyled onto the dark surface with gold-edged borders and hover glow — same content, same buttons, same data.
- Dark styling is scoped to this page only, so the rest of the app and theme toggle behave as before.

## Technical notes

- New tokens for the General surface (e.g. `--general-bg`, `--general-gold`, gradient and glow vars) added in `src/index.css` under a `.general-theme` scope, exposed in `tailwind.config.ts`; no hardcoded colour utilities.
- `src/pages/GeneralDashboard.tsx` wraps its root in `general-theme` and swaps card classes to the new tokens; logic (`useDailyRoi`, `useEntitlements`, counted-plan portfolio math, $0.00 profit baseline) unchanged.
- Portrait asset created via `lovable-assets create` from the upload; `src/components/MemberProfileCard.tsx` continues reading `profiles.avatar_url`.
- One SQL update to Jeremy's `profiles.avatar_url`; no schema changes.
