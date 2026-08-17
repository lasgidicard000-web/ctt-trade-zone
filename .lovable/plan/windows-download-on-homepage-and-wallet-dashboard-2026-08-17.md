# Windows download on homepage and wallet dashboard

## Current state (verified)

The homepage (`Index.tsx`) and the wallet dashboard (`Wallet.tsx`, compact variant) both already render the "Get the app" section, and that section already includes a Windows download button plus Windows install steps. Two gaps remain:

- The Windows button only appears once a release actually has a Windows ZIP attached (release `v1.0.0` has mobile artifacts only), so today no Windows button shows.
- The install steps ("unzip, run ctttradezone.exe") are only rendered when the visitor's OS is detected as Windows. Someone browsing on a phone sees no Windows guidance at all.

## What to change

1. **Always show a Windows option.** When the latest release has no Windows artifact, show a clearly labelled Windows row that links to the GitHub releases page with a short "Windows build is being prepared" note, instead of hiding Windows entirely. Applies to both the homepage section and the compact wallet card.
2. **Always show the Windows install steps** next to the Windows download (not gated on OS detection): download the ZIP, extract it, run `ctttradezone.exe`, no installer or admin rights needed. Keep the existing "matching build shown first" ordering for detected Windows users.
3. **Wallet dashboard placement**: keep the existing compact card where it is, but make sure the Windows row and its steps are visible there without needing to open `/downloads`.
4. **`/downloads` page**: mirror the same always-visible Windows entry and steps for consistency.

No backend, schema, or CI changes — the Windows artifact already gets built and attached by the release workflow; this is presentation only.

## Technical notes

- `src/lib/releaseAssets.ts` — add a fallback so the Windows slot resolves to a "pending" placeholder when no `windows-zip` asset exists.
- `src/components/GetTheAppSection.tsx` — render the Windows button unconditionally (real link or releases-page fallback) in both compact and full layouts.
- `src/components/BuildDownloads.tsx` — un-gate the Windows install hint from `os === "windows"`.
- `src/pages/Downloads.tsx` — same always-visible Windows block and steps.
