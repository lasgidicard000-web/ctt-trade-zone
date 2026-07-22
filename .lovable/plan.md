## Goal
Adopt the uploaded CTT Trade Zone logo as the site-wide brand mark and recolor the whole app to match its deep-indigo palette.

## Palette derived from the logo
- Background: deep navy `hsl(240 65% 8%)` (matches the black→blue gradient)
- Card: `hsl(240 55% 13%)`
- Primary (brand blue): `hsl(240 85% 45%)` — the vivid indigo on the right of the logo
- Accent (silver/platinum for the mark & ribbons): `hsl(220 15% 82%)`
- Ring / gradient stops derived from the same hues
- Foreground stays near-white; muted-foreground softened to a cool silver

## Files to change

1. **Upload logo as CDN asset**  
   `lovable-assets create --file /mnt/user-uploads/White_And_Black_Modern_Company_Logo.png --filename ctttradezone-logo.png > src/assets/ctttradezone-logo.png.asset.json`

2. **Favicon** — `public/favicon.png` copied from the upload; delete `public/favicon.ico`.

3. **`index.html`**
   - `<title>CTT Trade Zone — Crypto Investment & Trading</title>`
   - Real meta description, `og:title`, `og:description`, `og:type=website`, `og:url=https://ctttradezone.com`, `twitter:card=summary_large_image`, `twitter:title/description`.
   - `<link rel="icon" href="/favicon.png" type="image/png">`.
   - `Organization` JSON-LD with name "CTT Trade Zone" and url `https://ctttradezone.com`.

4. **`src/components/Navbar.tsx`**
   - Replace the `<Wallet>` icon tile + "Caltex" text with the imported logo image and the wordmark "CTT Trade Zone".
   - Logo `h-9 w-9 rounded` on all viewports; wordmark hidden on `sm`-down.

5. **`src/index.css`** — update `:root` and `.dark` tokens to the palette above (HSL only). Update `--gradient-primary`, `--gradient-accent`, `--glow-primary` to use the new indigo. This recolors buttons, cards, borders, focus rings, and the hero gradient across every page automatically because everything already consumes semantic tokens.

6. **`src/pages/Index.tsx`** — swap the hero headline gradient reference (`from-primary to-accent`) stays as-is since it reads from tokens; no code change needed beyond visual verification.

## Out of scope
- No changes to wallet flows, ROI, deposits, or the NOWPayments BTC address issue from the earlier turn (separate concern).
- No page-level per-route Helmet tags — sitewide head only, per the classic Vite stack guidance.

## Verification
After edits: view the preview at `/`, `/wallet`, `/investment-plans` to confirm the recolor reads clean and the logo renders sharp in the navbar and browser tab.
