# Build & Download section (auto-pulls latest GitHub release)

Right now the download buttons rely on hardcoded links in `src/config/appStores.ts` and only point at the releases page. This adds a real Build & Download section that asks GitHub for the newest release and lists the actual build files it contains.

## What it does

- Reads the latest release for your repo and shows: version tag, release date, and each downloadable build.
- Recognises and labels the artifacts by file type:
  - `.apk` — Android, direct install (sideload)
  - `.aab` — Android, Play Store bundle
  - `.xcarchive.zip` — iOS archive (for signing/submission)
  - `.ipa` — iOS installable build
- Shows file size and a one-click download per artifact.
- States clearly when: the repo isn't configured yet, no release exists yet, or the release has no build files attached.
- Refresh button to re-check without reloading the page.

## Where it appears

- Homepage: the existing "Get the App" section gains the live release list underneath the store buttons.
- Wallet dashboard: the compact card shows the newest APK/IPA download only, to stay small.
- New page `/downloads` with the full list of artifacts plus install notes (Android: allow unknown apps; iOS: needs signing/sideload tooling).

Store buttons (Google Play / App Store) keep their current "Coming soon" behaviour until you paste listing URLs.

## Technical notes

- New `src/hooks/useLatestRelease.ts`: fetches `https://api.github.com/repos/{owner}/{repo}/releases/latest` via React Query (5 min cache, 1 retry). No token needed for public repos; unauthenticated rate limit is fine for this traffic. If the call 404s or the repo is private, the UI falls back to the existing releases-page link.
- New `src/lib/releaseAssets.ts`: classifies assets into android-apk / android-aab / ios-archive / ios-ipa buckets, formats bytes, and picks the "recommended" download per platform.
- `src/config/appStores.ts`: keep `githubRepo` as the single place to set `owner/repo`; derive the API URL from it instead of only the releases URL.
- `src/components/GetTheAppSection.tsx`: add a `showReleases` prop; render the artifact list with loading skeletons and an error/empty state. Existing store-button behaviour untouched.
- New `src/pages/Downloads.tsx` + route in `src/App.tsx`, with a title/meta description and a single H1.
- All styling via existing semantic tokens — no hardcoded colours.

## What you still need to do

Set `githubRepo` in `src/config/appStores.ts` to your exported GitHub repo (`owner/repo`) and publish at least one release with the CI-built artifacts attached. Until then the section shows a clear "not configured yet" note instead of dead buttons.
