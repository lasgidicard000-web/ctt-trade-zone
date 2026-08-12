# Member Profile Card beside the CTT Debit Card

Add a branded profile card next to the CTT debit card on the wallet dashboard showing the member's professional portrait, name, and a badge for each active investment plan. Jeremy Element's retouched photo is set as his portrait, showing his 4 plan badges.

## The photo

The upload is a screenshot crop of a promo poster — it has a "18 of 25" overlay, cut-off text on the right, a bottom banner strip, and poster framing. Professionalizing it means:

- Cropping to a clean portrait framing of Jeremy: face, glasses, beard, crossed arms, the navy CTT shirt with the four embroidered plan badges (Commissioners, Superintendent, Inspectors, Recruit) and his name patch all kept intact and legible.
- Removing the screenshot overlay, the poster text block, and the bottom banner.
- The CTT Trade Zone logo/branding on the shirt kept crisp; colour, contrast and sharpness balanced for a studio-quality look; background softened to a clean brand-toned blur so the subject reads clearly at small sizes.
- Delivered at two sizes (a larger portrait plus a compact avatar crop) and hosted on the CDN, not committed as a heavy binary.

## What the user sees

- A new card beside the CTT debit card (stacked above it on mobile).
- The portrait in a rounded frame with a subtle brand-indigo glow ring, plus a verified-member chip.
- Member's display name and tier label.
- A row of plan badges — one per active plan, each in that plan's existing colour scheme — so Jeremy's card shows all four.
- A "Change photo" action for the owner of the dashboard to upload their own portrait.
- Members with no photo see styled initials instead, so it never looks broken.

## Availability

Generic component rendered for every user on their own dashboard, driven by their own photo and their own active plans — no hardcoded account. Jeremy's photo is seeded into his profile so it appears immediately.

## Technical notes

- New `src/components/MemberProfileCard.tsx`, rendered beside `CttDebitCard` in `src/pages/Wallet.tsx` (~line 715) inside a responsive two-column grid.
- Reads `profiles.display_name` and `profiles.avatar_url` (both already exist) plus active rows from `user_investments` for the badges; reuses the plan badge colour map from `ActiveInvestmentCard`.
- Tier label from the existing `useEntitlements` hook.
- Retouched portrait uploaded via the assets CLI; pointer committed as `src/assets/*.asset.json`.
- Upload path for other users: a public-read `avatars` storage bucket with owner-scoped write policies, then persist the URL to `profiles.avatar_url`.
- All colours use existing semantic tokens; no hardcoded colour utilities.
