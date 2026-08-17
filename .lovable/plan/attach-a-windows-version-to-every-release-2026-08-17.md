# Attach a Windows version to every release

Add a Windows desktop build alongside the existing Android and iOS artifacts, so the Build & Download section serves a real Windows app when someone opens the site from a PC.

## What gets added

**Electron desktop wrapper (committed)**
- `electron/main.cjs` — CommonJS main process, `contextIsolation: true`, `nodeIntegration: false`, loads the live site `https://ctttradezone.com` with a local `dist/index.html` fallback (matches the Capacitor `server.url` approach already used for mobile).
- `"main": "electron/main.cjs"` in `package.json`, plus a `desktop:build` script.
- `base: './'` in `vite.config.ts` so bundled assets resolve under `file://`.
- Dev dependencies: `electron`, `@electron/packager`.

**New `windows` job in `.github/workflows/mobile-release.yml`** (runs on `windows-latest`, same triggers as today)
- Checkout, Node 22, `npm ci` with the existing `npm install --legacy-peer-deps` fallback.
- `npm run build`, then `npx @electron/packager . ctttradezone --platform=win32 --arch=x64 --overwrite`.
- Zip the packaged folder as `ctttradezone-<tag>-windows-x64.zip` (portable, no admin install needed).
- Upload as a workflow artifact and attach to the release exactly like the Android/iOS jobs do.

Note: a signed `.exe`/MSI installer needs a code-signing certificate and electron-builder; the portable zip is the installable-without-certificate option. Say the word if you want the installer route later.

## App-side changes

- `src/lib/releaseAssets.ts`: new `windows-zip` artifact kind (matches `*-windows-*.zip` / `.exe`), labelled "Download for Windows — portable app (ZIP)", plus a `windows` platform in ordering and `pickRecommended`.
- `src/hooks/usePlatform.ts`: detect Windows and return `os: "windows"` with label "Windows" (desktop stays the fallback for macOS/Linux).
- `src/components/BuildDownloads.tsx`: on Windows show the Windows build first with install steps ("unzip, then run ctttradezone.exe"); on desktop/other show Windows + Android + iOS. Mobile behaviour unchanged.
- `src/pages/Downloads.tsx` and `src/components/GetTheAppSection.tsx`: include Windows in the full artifact list and copy.
- `docs/app-store-submission.md`: short Windows section (portable zip today, signing requirements for the Microsoft Store).

## After approval

The workflow only runs on GitHub, so the Windows asset appears once the repo syncs and a new release (e.g. `v1.0.1`) is published — the existing `v1.0.0` will keep showing only mobile builds until then.
