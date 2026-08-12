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
 * to GitHub — the Build & Download section then reads the latest release and
 * lists every build artifact the CI workflow attached.
 */
export const githubRepo = "";

/** GitHub API endpoint for the newest published release. */
export const latestReleaseApiUrl = githubRepo
  ? `https://api.github.com/repos/${githubRepo}/releases/latest`
  : "";

/** Human-facing releases page (fallback link). */
export const releasesPageUrl = githubRepo
  ? `https://github.com/${githubRepo}/releases/latest`
  : "";

/** Direct link to the newest built Android APK (or the releases page). */
export const directApkUrl = releasesPageUrl;

/** Direct link to the newest built iOS artifact (or the releases page). */
export const directIpaUrl = releasesPageUrl;
