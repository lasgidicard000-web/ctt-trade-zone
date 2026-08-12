# Producing the real APK and iOS app files

The binaries cannot be compiled here — this environment has no Java/Android SDK and no Xcode (Apple only allows iOS builds on macOS). The build must run on GitHub Actions, which is already wired up. This plan makes that path actually produce a downloadable APK today, and prepares the iOS side.

## Step 1: Make the Android build always produce an installable APK

Update `.github/workflows/mobile-release.yml`:

- Add a `push` trigger on the main branch (currently only release + manual), so every change yields a fresh build.
- When no signing keystore secret is present, generate a throwaway debug keystore in CI and sign the release APK with it, instead of falling back to a debug build. Result: an APK that installs on any Android phone (sideload).
- Keep the signed path (Play-ready `.aab`) when your real keystore secrets are set.
- Rename outputs clearly: `ctttradezone-<tag>-sideload.apk` vs `ctttradezone-<tag>-play.aab`.

## Step 2: App identity for the native shells

- Add `@capacitor/assets` and a `resources/` folder using the existing gold shield badge as source, so `npx cap sync` generates all Android/iOS icon and splash sizes automatically in CI (no more default Capacitor icon).
- Set the Android `versionName`/`versionCode` and iOS `CFBundleShortVersionString` from the release tag inside CI.

## Step 3: iOS artifact

- Keep the macOS job producing an `.xcarchive` when no Apple credentials exist. Add a step that also exports an **unsigned `.ipa`** so it can be installed via sideloading tools (AltStore/Sideloadly) without a paid account.
- With `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_TEAM_ID` set, it exports a proper App Store `.ipa`.

## Step 4: Wire the download buttons to real files

In `src/config/appStores.ts` add two new optional fields for direct downloads (`directApkUrl`, `directIpaUrl`) pointing at the GitHub latest-release asset URLs. `GetTheAppSection.tsx` then shows:

- "Download APK (Android)" — active as soon as the first release exists.
- "Google Play" / "App Store" — stay "Coming soon" until listings are live.

## What you must do (cannot be automated from here)

1. Connect/export the project to GitHub (Actions only runs on GitHub).
2. Publish a release tag (e.g. `v1.0.0`) or run "Mobile release builds" manually.
3. Download the APK from the release assets; install it on Android (enable "Install unknown apps").
4. For an installable iOS app, an Apple Developer account ($99/yr) and the four secrets above are required — Apple has no free path to a distributable IPA.

## Technical notes

- The app shell loads `https://ctttradezone.com` live (`capacitor.config.ts` `server.url`), so app content updates without new builds; only native changes need a rebuild.
- `android/` and `ios/` stay generated in CI (git-ignored) — nothing native is committed.
- `docs/app-store-submission.md` gets a short "Get the APK now" section at the top with the three steps above.
