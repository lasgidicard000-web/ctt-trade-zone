# Smart platform detection for app downloads

Make the download experience adapt to the visitor's device: Android users see the APK first, iOS users see the iOS build and sideload steps, desktop users see both plus a "scan/open on your phone" hint.

## What changes for users

- **Homepage "Get the app" section**: the primary button matches the detected OS (Google Play / App Store when live, otherwise the matching build from the latest release). The other platform stays available as a smaller secondary link.
- **Wallet dashboard card (compact)**: shows only the build relevant to the detected device, with a one-line install hint.
- **/downloads page**: install instructions reorder so the detected platform's card comes first and is highlighted; the other platform collapses into a "Other platforms" area that can still be expanded. A small banner names the detected device ("Looks like you're on Android") with a "Show all platforms" toggle so detection is never a dead end.
- iOS-specific nuance: on iPhone/iPad, hide the AAB (never installable) and, when no IPA exists, show the "Add to Home Screen" web-app route instead of a broken download.
- Android nuance: hide the AAB from primary position (Play upload only) and surface the "allow unknown apps" step inline.

## Technical notes

- New `src/hooks/usePlatform.ts`: returns `{ os: "android" | "ios" | "desktop" | "other", isMobile, isIpadOS }`, derived from `navigator.userAgent` / `userAgentData` plus the iPadOS check (`navigator.platform === "MacIntel" && maxTouchPoints > 1`). Pure client detection, no new dependency.
- `src/components/BuildDownloads.tsx`: accept an optional `platform` prop (defaults to detected). Ordering and filtering of the classified artifacts follow the detected OS; compact mode picks the single recommended artifact for that OS.
- `src/lib/releaseAssets.ts`: add a small `sortForPlatform(artifacts, os)` helper next to the existing `pickRecommended`, keeping classification logic in one place.
- `src/components/GetTheAppSection.tsx`: primary/secondary button split driven by detected OS; existing "Coming soon" behaviour for empty store URLs is preserved.
- `src/pages/Downloads.tsx`: reorder the two instruction cards, add the detected-device banner and an override toggle; keep current copy and SEO tags.
- No backend, config, or workflow changes; `src/config/appStores.ts` stays as-is.
