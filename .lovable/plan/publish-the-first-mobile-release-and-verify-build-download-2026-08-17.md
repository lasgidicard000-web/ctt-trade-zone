# Publish the first mobile release and verify Build & Download

Goal: create the first GitHub release (`v1.0.0`) on `lasgidicard000-web/ctt-trade-zone`, let the existing CI attach the Android APK/AAB and iOS IPA/archive to it, then confirm the in-app Build & Download section lists those real files.

## What happens

1. **Connect GitHub**
   A GitHub connect card appears in chat. It authorizes release creation on your repo. No workspace connection exists yet, so this step is required before anything can be published.

2. **Publish release `v1.0.0`**
   Create a published release tagged `v1.0.0` on the default branch, titled "CTT Trade Zone 1.0.0", with short release notes covering the first Android and iOS builds.

3. **CI attaches the builds automatically**
   The existing `Mobile release builds` workflow already triggers on `release: published` and uploads to the release:
   - `ctttradezone-v1.0.0-sideload.apk` (signed with a throwaway key unless Play signing secrets are set)
   - `ctttradezone-v1.0.0-play.aab`
   - `ctttradezone-v1.0.0-unsigned.ipa` and `ctttradezone-v1.0.0.xcarchive.zip` (unsigned unless Apple signing secrets are set)
   The Android job takes roughly 5-10 minutes; the macOS iOS job typically 15-25 minutes. The release exists immediately; the files appear as each job finishes.

4. **Verify in the app**
   Once the run completes, poll the release from GitHub to confirm the assets are attached, then load the homepage Get-the-App section and `/downloads` in a simulated Android and iPhone browser and confirm:
   - Android shows **Download APK** first, iPhone shows **Download iOS build (.ipa)** first
   - The "builds being prepared" note is gone
   - Each button points at the real release asset URL

No app code changes are expected. If a build job fails, report the failing step and propose the fix rather than shipping a half-filled release.

## Technical notes

- Release creation goes through the GitHub connector (`POST /repos/{owner}/{repo}/releases` with `tag_name: v1.0.0`, `draft: false`, `prerelease: false`). A draft release does not fire the `release: published` trigger, so it must be published directly.
- `src/config/appStores.ts` already points at the repo; `useLatestRelease` reads `releases/latest`, which requires the repo to be public (it is) and at least one non-draft release.
- Artifact classification in `GetTheAppSection.tsx` / `BuildDownloads.tsx` matches on `.apk`, `.aab`, `.ipa`, `.xcarchive.zip` — the CI filenames above line up, no mapping changes needed.
- Production store-ready signing (Play upload key, Apple cert/profile) remains optional and can be added later as repo secrets; the current release stays sideload-only.
