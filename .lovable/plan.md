# Real download buttons instead of "Coming soon"

## What I verified on a phone
- Android phone: Google Play button first, then App Store, with "Looks like you're on Android".
- iPhone: App Store first, then Google Play, with "Looks like you're on iPhone / iPad".
- `/downloads` correctly reorders the install steps for the detected device and keeps the "Show all platforms" toggle.
- Both store buttons show "Coming soon" (no store URLs set), and Build & Download says "No release published yet" because the GitHub release API for your repo returns 404 — no published release yet.

## What to change
Turn the mobile section into a real download experience driven by the latest GitHub release, instead of disabled "Coming soon" chips.

1. **Android card**: primary button "Download APK" linking to the APK asset from the newest release. Secondary small link for the AAB (Play upload only), shown on desktop only.
2. **iOS card**: primary button "Download iOS build (.ipa)" linking to the IPA asset, with a one-line note that it needs sideloading (AltStore / Sideloadly) until the App Store listing exists.
3. **Store buttons**: only render Google Play / App Store buttons when their URLs are actually set in config. No "Coming soon" chips anywhere.
4. **When no release exists yet**: show a single "View releases on GitHub" button plus a short line explaining the build is being prepared — never a dead/disabled button.
5. **OS detection stays as is**: the detected platform's card and button still come first; the other platform is available below.
6. Same treatment applied consistently in the homepage section, the wallet dashboard card, and the `/downloads` page.

## Technical notes
- Files touched: `src/components/GetTheAppSection.tsx`, `src/components/BuildDownloads.tsx`, `src/pages/Downloads.tsx`, and `src/config/appStores.ts` (drop the placeholder "coming soon" states).
- Download URLs come from the existing `useLatestRelease` hook and `releaseAssets` classifier — no new plumbing.
- Repo is public, so browser-side GitHub API access works; keep the existing rate-limit fallback to the releases page.
- You still need one published GitHub release (tag `v1.0.0`, or run the "Mobile release builds" workflow) for the real files to appear; until then the section shows the prepared-state message.
