# Get the App: Play Store & App Store buttons

Add a "Get the App" section with an **Android (Google Play)** button and an **iOS (App Store)** button on the homepage and on the wallet dashboard. Buttons link to your future store listings.

## What I can and can't do

- I can build the buttons, the section design, and the store-link configuration. Done today.
- I cannot compile an APK or an IPA, and I cannot submit to Google Play or the App Store. Those require a native build on your own machine and paid developer accounts (Google Play: $25 one-time, Apple: $99/year). Store submission is a manual step only you can complete.
- Until listings exist, the buttons show a "Coming soon" state instead of dead links.

## What gets built

**New component: `src/components/GetTheAppSection.tsx`**
- Heading, one line of copy, and two large store buttons with Android and Apple icons.
- Reads store URLs from a single config file. If a URL is empty, the button renders disabled with a "Coming soon" chip and an inline note that the web app works in any mobile browser today.
- Mobile-first layout: stacked full-width buttons on phones, side-by-side on desktop.

**New config: `src/config/appStores.ts`**
- `googlePlayUrl` and `appStoreUrl`, both empty strings for now, plus the intended app name `ctttradezone`. One place to paste real links later.

**Homepage (`src/pages/Index.tsx`)**
- Insert the section between the features grid and the existing lower section. No existing content, navigation, or footer changes.

**Dashboard (`src/pages/Wallet.tsx`)**
- Add a compact variant of the same component near the bottom of the wallet page, below existing cards.

Styling uses existing semantic tokens only, so it matches the current indigo/navy theme in light and dark mode.

## Store submission checklist (for you, later)

I will add `docs/app-store-submission.md` with the concrete steps: wrap the site with Capacitor, generate signed Android and iOS builds locally, prepare icons and screenshots, create the Play Console and App Store Connect listings under the name **ctttradezone**, then paste the two resulting URLs into `src/config/appStores.ts` so the buttons go live.

Say the word if you'd rather the buttons instantly install the web app to the home screen instead of waiting on store listings — that path needs no accounts.
