# Get the APK and iOS app ready from GitHub

Your GitHub repo is connected (`lasgidicard000-web/ctt-trade-zone`). The mobile build pipeline is already in the repo. This plan wires the app to that repo and triggers the first build.

## What will change

1. Set `githubRepo` in `src/config/appStores.ts` to `lasgidicard000-web/ctt-trade-zone`.
2. The homepage, wallet dashboard, and `/downloads` page will then read the latest GitHub release live and show the actual APK/AAB/iOS artifacts.
3. Trigger the first build so the artifacts exist.

## Steps

### Step 1 — Point the app at your GitHub repo

Update `src/config/appStores.ts`:

```ts
export const githubRepo = "lasgidicard000-web/ctt-trade-zone";
```

Leave `googlePlayUrl` and `appStoreUrl` empty until the store listings are live.

### Step 2 — Push the change to GitHub

Because Lovable is connected to GitHub with two-way sync, saving the file in Lovable will push to the `main` branch automatically.

If sync is not automatic, use the Lovable editor to push/sync the change.

### Step 3 — Trigger the build workflow

The workflow `.github/workflows/mobile-release.yml` runs on:
- every push to `main`, or
- publishing a GitHub release, or
- manually from the Actions tab.

**Fastest option — push to main:**
After Step 2, go to GitHub → Actions → "Mobile release builds" and you should see a run starting.

**Alternative — manual run:**
GitHub → Actions → "Mobile release builds" → Run workflow → Run workflow.

**Alternative — release tag:**
Publish a release tag like `v1.0.0`. The workflow will attach the artifacts directly to that release.

### Step 4 — Download the artifacts

After the workflow finishes:

- **Android APK:** open the workflow run → Artifacts → `android-builds`, or go to the release assets and download `ctttradezone-<tag>-sideload.apk`.
- **iOS:** download `ctttradezone-<tag>-unsigned.ipa` and `ctttradezone-<tag>.xcarchive.zip` from the same place.

The APK installs on Android after allowing "Install unknown apps" for your browser/file manager.

The iOS unsigned IPA must be re-signed with a sideloading tool (AltStore/Sideloadly) using an Apple ID before it will install.

### Step 5 — Optional: production signing

For a Play Store-ready `.aab` and a distributable App Store `.ipa`, add these GitHub repository secrets under Settings → Secrets and variables → Actions:

| Platform | Secrets |
| --- | --- |
| Android | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| iOS | `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_TEAM_ID` |

Without these secrets the workflow still succeeds and produces installable test builds.

## What you'll see in the app

- Homepage "Get the App" section will list the newest APK/iOS builds automatically.
- Wallet dashboard will show the recommended download for the visitor's OS.
- `/downloads` page will show all artifacts plus Android/iOS install instructions.

## What you still need to do yourself

1. Provide the GitHub repo name (already done: `lasgidicard000-web/ctt-trade-zone`).
2. Push the config change to GitHub.
3. Trigger and wait for the first Actions run.
4. Download and install the APK on an Android device.
5. For iOS distribution, enroll in the Apple Developer Program and add the iOS signing secrets.
