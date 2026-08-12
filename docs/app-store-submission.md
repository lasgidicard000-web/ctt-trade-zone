# Publishing ctttradezone to Google Play and the App Store

## Get the APK right now (3 steps)

1. Export this project to GitHub ("Export to GitHub" in Lovable). GitHub Actions
   only runs on GitHub.
2. Publish a release tag (e.g. `v1.0.0`) or run Actions > "Mobile release builds"
   > Run workflow. Every push to `main` also produces a build.
3. Download `ctttradezone-<tag>-sideload.apk` from the release assets (or the
   Actions run artifacts) and install it on Android — enable "Install unknown
   apps" for your browser/file manager when prompted.

The APK is always signed in CI: with your own keystore if the secrets below are
set, otherwise with a throwaway CI key so it still installs. Only the
`.aab` signed with **your** keystore can be uploaded to Google Play.

For iOS the workflow produces `ctttradezone-<tag>-unsigned.ipa` plus an
`.xcarchive.zip`. An unsigned IPA must be re-signed (Sideloadly/AltStore with an
Apple ID) before it installs — Apple offers no free path to a distributable app.
With the Apple secrets set, a proper App Store `.ipa` is exported instead.

Then paste your `owner/repo` into `src/config/appStores.ts` (`githubRepo`) so the
homepage and dashboard download buttons point at your latest release.

The website is a web app. To appear in the stores it must be wrapped in a native
shell (Capacitor) and submitted manually. Lovable cannot compile or submit binaries.

## 0. Prerequisites

- Google Play Developer account — $25 one-time
- Apple Developer Program — $99/year
- A Mac with Xcode (required for iOS; Android works on any OS)
- Node.js + Android Studio

## 1. Wrap the site with Capacitor (local machine)

```bash
git clone <your-repo> && cd <your-repo>
npm install
npm install @capacitor/core @capacitor/cli
npx cap init ctttradezone com.ctttradezone.app --web-dir=dist
npm install @capacitor/android @capacitor/ios
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

In `capacitor.config.ts` point the app at the live site so content stays current:

```ts
server: { url: "https://ctttradezone.com", cleartext: false }
```

## 2. Android build (APK / AAB)

```bash
npx cap open android
```

In Android Studio: Build > Generate Signed Bundle / APK. Create a keystore and
keep it safe — the same key must sign every future update. Play Store requires an
`.aab`; an `.apk` is only for direct sideloading.

## 3. iOS build (IPA)

```bash
npx cap open ios
```

In Xcode: set the team/signing identity, bump the version, then
Product > Archive > Distribute App > App Store Connect.

## 4. Store assets

- App icon 1024x1024 (use `public/favicon.png` source badge at full resolution)
- Feature graphic 1024x500 (Play)
- Screenshots: phone and tablet for Play; 6.7" and 5.5" iPhone for Apple
- Privacy policy URL (required by both stores)
- Short + full description, app name **ctttradezone**

## 5. Create the listings

- Google Play Console > Create app > upload the `.aab` > complete Data safety and
  content rating > roll out to Production.
- App Store Connect > New App > bundle ID `com.ctttradezone.app` > upload build
  from Xcode > complete App Privacy > Submit for Review.

Financial/crypto apps get extra scrutiny from Apple: be ready to supply company
registration, licensing details, and a demo account for review.

## 6. Turn the buttons on

Once each listing is live, paste the URLs into `src/config/appStores.ts`:

```ts
export const googlePlayUrl = "https://play.google.com/store/apps/details?id=com.ctttradezone.app";
export const appStoreUrl = "https://apps.apple.com/app/ctttradezone/idXXXXXXXXXX";
```

The homepage and dashboard buttons activate automatically and the
"Coming soon" state disappears.

## 7. Automated builds via GitHub Actions

`.github/workflows/mobile-release.yml` builds both platforms automatically.

**Triggers:** publishing a GitHub release, or running the workflow manually
(Actions > "Mobile release builds" > Run workflow).

**Output:**
- Android: `ctttradezone-<tag>-sideload.apk` and `ctttradezone-<tag>-play.aab`
- iOS: `ctttradezone-<tag>.ipa` (signed), or `ctttradezone-<tag>-unsigned.ipa` + `ctttradezone-<tag>.xcarchive.zip` (unsigned)

Downloads appear as assets on the release itself, and as artifacts on the
Actions run for manual builds.

**Repository secrets for signed builds** (Settings > Secrets and variables > Actions):

| Platform | Secrets |
| --- | --- |
| Android | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| iOS | `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_TEAM_ID` |

Base64-encode files with `base64 -i keystore.jks | pbcopy`.

Without these secrets the workflow still succeeds: Android yields a CI-signed
release APK you can sideload, and iOS yields an unsigned archive that must be
re-signed before it can be installed (an Apple restriction).

The `android/` and `ios/` folders are generated in CI (`npx cap add`) and are
git-ignored, so nothing native needs to be committed.

App icons and splash screens are generated in CI from `resources/icon.png` and
`resources/splash.png` via `@capacitor/assets`.
