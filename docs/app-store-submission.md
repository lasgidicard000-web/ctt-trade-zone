# Publishing ctttradezone to Google Play and the App Store

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
