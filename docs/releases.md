# Releases

Every published GitHub release runs `.github/workflows/mobile-release.yml`, which attaches
the installable builds automatically. The site's Build & Download section and `/downloads`
read the newest release, so nothing needs to be changed in the app afterwards.

## Assets attached to each release

| File | Platform | Notes |
| --- | --- | --- |
| `ctttradezone-<tag>-sideload.apk` | Android | Installs directly on any Android phone |
| `ctttradezone-<tag>-play.aab` | Android | Google Play upload bundle only |
| `ctttradezone-<tag>-sideload-unsigned.ipa` | iPhone | Install with AltStore / Sideloadly |
| `ctttradezone-<tag>.ipa` | iPhone | Only produced when Apple signing secrets exist |
| `ctttradezone-<tag>.xcarchive.zip` | iPhone | For App Store submission later |
| `ctttradezone-<tag>-windows-x64.zip` | Windows | Portable app + README, unzip and run the .exe |

## Publishing 1.1.0

1. GitHub → Releases → **Draft a new release**.
2. Tag: `v1.1.0`, target `main`, title `CTT Trade Zone 1.1.0`.
3. Click **Publish release**.
4. The Android, iPhone and Windows jobs run (~15–25 min) and attach their files.

## Version history

- **v1.1.0** — Windows portable desktop app completed (real app icon, product metadata,
  README inside the ZIP) and the iPhone build made properly sideload-ready
  (signature stripped, version keys set from the tag, clearer file name).
- **v1.0.0** — First release: Android APK/AAB and iPhone archive.

## Signing (optional, unlocks store-ready builds)

| Platform | Secrets |
| --- | --- |
| Android | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| iPhone | `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `IOS_TEAM_ID` |

Windows code signing (to remove the SmartScreen warning) needs a purchased certificate and
is not wired into the workflow.
