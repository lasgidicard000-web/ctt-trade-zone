## Update site title, description, and favicon

### Current state
- `index.html` uses the generic placeholder title `7e88a8b7-2d0e-4008-bc9e-cd0150b9f814` and description `Lovable Generated Project`.
- `public/favicon.ico` is the default Lovable favicon.

### Changes
1. **Head metadata** — rewrite the sitewide `<title>` and `<meta name="description">` in `index.html`:
   - **Title**: `Investment/tradezone`
   - **Description**: `Multipurpose website for transparent transactions`
2. **Open Graph / Twitter tags** — update `og:title`, `og:description`, and matching `twitter:title`, `twitter:description` so social previews match.
3. **Favicon** — generate a simple brand icon saved to `public/favicon.png`, delete the default `public/favicon.ico`, and point `index.html` to the new icon.

### Files affected
- `index.html`
- `public/favicon.ico` (delete)
- `public/favicon.png` (add)

### Out of scope
- No per-route metadata (requires `react-helmet-async`).
- No social-preview image generation unless requested.