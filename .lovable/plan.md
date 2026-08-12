# Member Profile Card beside the CTT Debit Card

Add a branded profile card next to the CTT debit card on the wallet dashboard that shows the member's retouched portrait, their name, and a badge for each active investment plan.

## What the user sees

- A new card sitting beside the CTT debit card (stacked above it on mobile).
- Circular portrait with a glowing ring in the brand indigo, a verified-member chip, and the member's display name plus tier label.
- A row of plan badges — one per active plan (e.g. Recruit, Inspectors, Superintendent, Commissioners) — styled with each plan's existing colour scheme, so Jeremy's shows his 4 active plan badges.
- A small "Change photo" action for the signed-in owner to upload their own portrait.
- Members with no portrait yet get initials in the same styled ring, so the card looks intentional for everyone.

## Photo handling

- Once you attach Jeremy's photo, it gets professionalized: background cleaned to a subtle brand-gradient studio backdrop, colour/contrast/sharpness balanced, cropped square and centred on the face, and the CTT Trade Zone logo on the shirt kept legible.
- The finished portrait is uploaded to CDN asset storage and set as Jeremy's profile photo so it loads fast and is not committed as a heavy binary.

## Availability

Component is generic and renders for every user on their own dashboard, driven by their own profile photo and their own active plans — no hardcoded account.

## Technical notes

- New `src/components/MemberProfileCard.tsx`; rendered next to `CttDebitCard` in `src/pages/Wallet.tsx` (line ~715) inside a responsive two-column grid.
- Reads `profiles.display_name` and `profiles.avatar_url` (both already exist) and active rows from `user_investments` for the badge list; reuses the plan badge colour map already used by `ActiveInvestmentCard`.
- Tier label comes from the existing `useEntitlements` hook.
- Upload path: a public-read `avatars` storage bucket with owner-scoped write policies, then persist the public URL to `profiles.avatar_url`.
- Jeremy's retouched portrait is written to his `profiles.avatar_url` directly so it shows immediately.
- All colours use existing semantic tokens; no hardcoded colour utilities.

## Waiting on

The photo of Jeremy in the CTT Trade Zone shirt — attach it and I will retouch it as part of building this.
