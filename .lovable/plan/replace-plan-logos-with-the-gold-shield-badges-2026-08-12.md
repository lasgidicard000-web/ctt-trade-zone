# Replace plan logos with the gold shield badges

Swap the generic Lucide icons (Star, Shield, Award, TrendingUp, Crown) used for the five investment plans for the gold shield badge artwork from the uploaded graphic.

## What changes

- Crop the five shields out of the uploaded image (Recruit, Inspectors, Superintendent, Commissioners, General), each as a clean transparent-background square badge.
- Host them as CDN assets and add one shared badge map so every place that shows a plan identity uses the same artwork.
- Use the badges on:
  - Investment Plans page — each plan card header shows its shield instead of the icon tile.
  - Wallet dashboard active investment cards — shield next to the plan name.
  - Member Profile Card plan badges — shield chip per active plan.
- Keep all existing plan copy, pricing, gradients, buttons, and behaviour untouched.

## Technical notes

- Crop with Pillow from `/mnt/user-uploads/file_000000008c888246a259b139cd3e7ec6.png`, trim the navy background to transparency, save as PNG.
- Upload each with `lovable-assets create` and commit only the `.asset.json` pointers under `src/assets/plans/`.
- New `src/lib/planBadges.ts` exporting `planBadgeUrl(planId)` keyed by `recruit | inspectors | superintendent | commissioners | general`, with graceful fallback to the current icon if a plan id is unknown.
- Edits limited to `src/pages/InvestmentPlans.tsx`, `src/components/ActiveInvestmentCard.tsx`, `src/components/MemberProfileCard.tsx`, plus the new asset pointers and helper.
- Images get descriptive alt text (e.g. "Commissioners Plan badge").
