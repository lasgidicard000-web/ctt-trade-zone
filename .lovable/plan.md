# Social share preview image + completed OG/Twitter tags

Your `index.html` already carries OG and Twitter title, description, type and card tags. What's missing is the **preview image** — which is why shared links currently render as a bare text card. This adds a real branded image plus the supporting tags around it.

## The share image

A 1200x630 banner (the standard size for large social cards), built from your actual logo — no invented artwork:

```text
┌────────────────────────────────────────────────┐
│                                                │
│   ┌────────┐    CTT TRADE ZONE                 │
│   │ badge  │    ─────────────                  │
│   │  logo  │    AI-powered crypto investment   │
│   └────────┘    plans, trading & instant       │
│                 deposits                       │
│                                     ctttradezone.com │
└────────────────────────────────────────────────┘
    navy → indigo gradient, matching the site
```

- The glowing blue CTT Trade Zone badge you uploaded for the favicon, placed left at full fidelity.
- Brand name and tagline set beside it in the site's light-on-navy palette.
- Background gradient drawn from the existing theme colors so it matches the app.
- Saved as `public/og-image.png`.

Tagline: since no custom wording came through, it will use your existing meta description phrasing — "AI-powered crypto investment plans, trading and instant deposits." Say the word and I'll swap in any line you prefer.

## Tags to add

Alongside the image, the head gets the tags that make previews render correctly and completely:

- `og:image` and `twitter:image` pointing at the absolute `https://ctttradezone.com/og-image.png`
- `og:image:width` / `og:image:height` (1200 / 630) so platforms lay the card out before the image downloads
- `og:image:alt` and `twitter:image:alt` for accessibility
- `og:site_name` and `og:locale`

Existing title, description, canonical, `og:url`, `og:type` and `twitter:card` stay as they are — they're already correct.

## Technical notes

- Absolute `https://` URLs are required: social crawlers do not resolve relative image paths. `https://ctttradezone.com` is your active custom domain, so the image resolves there once published.
- The image must be a real file in `public/`, not a CDN asset pointer, so crawlers can fetch it at a stable path.
- Composed with ImageMagick from the uploaded badge, then visually inspected at full size before delivery to confirm nothing is clipped, stretched or low-contrast.
- No changes to app code, routing or components — this is `index.html` plus one new file in `public/`.

## Worth knowing

This is a static single-page app, so one accurate site-level preview is what crawlers can see; per-route previews would need server-side rendering. For most sharing (homepage links, WhatsApp, X, LinkedIn, Slack) a single strong card is the right target.

Platforms also cache the preview they last scraped, so an already-shared link may keep showing the old text-only card until they re-fetch. You can force it immediately in each platform's link preview debugger.
