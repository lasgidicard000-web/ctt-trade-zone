# GitHub Actions: build Android APK and iOS artifacts on every release

Automate the mobile builds so that each GitHub release produces downloadable artifacts. Capacitor is not yet in the project (no `capacitor.config.ts`, no Capacitor packages, no `.github/` folder), so this adds the native wrapper plus the CI workflow.

## What gets added

**Capacitor wrapper (committed to the repo)**
- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`.
- `capacitor.config.ts` with app id `com.ctttradezone.app`, app name `ctttradezone`, `webDir: dist`, and `server.url` pointing at `https://ctttradezone.com` so shipped apps always show the live site.
- npm scripts: `cap:sync`, `mobile:android`, `mobile:ios`.
- Native `android/` and `ios/` folders are generated inside CI (`npx cap add ...`) rather than committed, keeping the repo clean.

**Workflow: `.github/workflows/mobile-release.yml`**
Triggers on `release: [published]` and on manual `workflow_dispatch`.

- Job `android` (ubuntu-latest): checkout, Node 20, `npm ci`, `npm run build`, `npx cap add android`, `npx cap sync android`, then Gradle `assembleRelease` + `bundleRelease`. If signing secrets exist the APK/AAB are signed; otherwise it falls back to an unsigned debug APK so the job never blocks. Uploads `ctttradezone-<tag>.apk` and `.aab` as workflow artifacts and attaches them to the release.
- Job `ios` (macos-latest): checkout, Node 20, `npm ci`, `npm run build`, `npx cap add ios`, `npx cap sync ios`, `xcodebuild archive`. Without Apple signing secrets it produces an unsigned `.xcarchive` zip (installable only via re-signing); with secrets it exports a signed `.ipa`. Uploads the artifact and attaches it to the release.

**Docs update: `docs/app-store-submission.md`**
Add a CI section describing where to download builds (release assets / Actions run artifacts) and which secrets unlock signed output.

## Secrets you add on GitHub (optional but needed for installable builds)

Android: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
iOS: `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_TEAM_ID`.

Until these exist the workflow still runs and yields an unsigned Android APK you can sideload; iOS requires signing to be installable — that is an Apple restriction, not a workflow gap.

## Limits worth stating plainly

- Actions runs on GitHub, so the repo must be connected via Git sync for the workflow to execute.
- The store buttons in `src/config/appStores.ts` stay "Coming soon" — this plan produces downloadable builds, not store listings.

## Optional follow-up (say if you want it)

Point the homepage Android button at the GitHub latest-release APK URL so visitors can install directly without a Play listing.
