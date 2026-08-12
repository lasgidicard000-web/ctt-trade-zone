/**
 * Central place for the native app distribution links.
 * Paste the real values here once available and the
 * "Get the App" buttons become active automatically.
 */
export const APP_NAME = "ctttradezone";

/** e.g. https://play.google.com/store/apps/details?id=com.ctttradezone.app */
export const googlePlayUrl = "";

/** e.g. https://apps.apple.com/app/ctttradezone/id0000000000 */
export const appStoreUrl = "";

/**
 * GitHub repository in "owner/repo" form. Set this after exporting the project
 * to GitHub — the direct download buttons then point at the latest release,
 * where the CI workflow attaches the APK and iOS artifacts.
 */
export const githubRepo = "";

/** Direct link to the newest built Android APK (or the releases page). */
export const directApkUrl = githubRepo
  ? `https://github.com/${githubRepo}/releases/latest`
  : "";

/** Direct link to the newest built iOS artifact (or the releases page). */
export const directIpaUrl = githubRepo
  ? `https://github.com/${githubRepo}/releases/latest`
  : "";
