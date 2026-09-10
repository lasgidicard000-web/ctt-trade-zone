# Complete the Windows and iPhone versions

The build pipeline already produces Android, iPhone and Windows files, and every recent run on the main branch succeeded. The gap: the published release (1.0.0, from August) only carries Android and iPhone files — no Windows app — and the Windows app currently ships with the default Electron icon. This plan finishes both platforms and publishes a fresh 1.1.0 release so all three downloads appear on the site.

## Windows (portable ZIP)

- Add a real app icon: generate `resources/icon.ico` from the existing gold shield `resources/icon.png` during the build, and pass `--icon` to the packager so the window, taskbar and .exe use the CTT logo.
- Set proper file metadata on the packaged app: app name `CTT Trade Zone`, company name, and version taken from the release tag (`--app-version`, `--win32metadata`).
- Include a short `README.txt` inside the ZIP: unzip, run `ctttradezone.exe`, and a note about the one-time Windows "unknown publisher" prompt.
- Keep the portable ZIP format — no code-signing certificate required.

## iPhone (sideload-ready, no Apple account yet)

- Keep the unsigned build path, but make the produced file genuinely installable with AltStore/Sideloadly:
  - Ensure the app bundle keeps a valid `Info.plist` version from the tag and a stripped code signature so re-signing tools accept it.
  - Name the asset `ctttradezone-<tag>-sideload-unsigned.ipa` so it is obvious what it is.
- Also keep the `.xcarchive.zip` for later App Store submission.
- The signed path stays in place: the moment you add the four Apple secrets, the same workflow exports a real App Store `.ipa` with no further changes.

## Download experience in the app

- `/downloads` and the Build & Download section: add clear per-platform install steps for Windows (unzip → run the .exe) and a plain-language iPhone note explaining the sideloading tool requirement and that a normal App Store install needs an Apple developer account.
- Windows visitors keep seeing the Windows build first; iPhone visitors see the iPhone file first.

## Publishing release 1.1.0

- Add a `docs/releases.md` entry and bump the version used for tagging.
- After approval you publish the tag `v1.1.0` on GitHub (Releases → Draft a new release → tag `v1.1.0` → Publish). All three jobs then attach their files to that release automatically, and the site's download buttons pick them up with no further changes.

## What still cannot be done from here

- A Windows installer without a security warning, and an App Store-ready iPhone app, both require paid certificates (Windows code-signing, Apple Developer Program). Everything else is covered above.
