## Plan: Add Bold Investment Plans CTA to Homepage

### Change
**`src/pages/Index.tsx`** — Add a prominent, bold primary CTA button in the hero section linking to `/investment-plans` (which maps to ctttradezone.blog/investment-plans on the live domain).

### Details
- Place the new button as the **first/leading CTA** in the hero button row, above/before "Redeem Gift Card".
- Style: `size="lg"`, bold primary gradient background (`bg-gradient-to-r from-primary to-accent`), white text, larger font weight (`font-bold`), with `TrendingUp` icon and a subtle glow/shadow for emphasis.
- Label: **"View Investment Plans"**
- Uses React Router `<Link to="/investment-plans">` so it works on both preview and the custom domain.

### Files Modified
- `src/pages/Index.tsx`
