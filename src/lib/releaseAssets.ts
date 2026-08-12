export type ArtifactKind =
  | "android-apk"
  | "android-aab"
  | "ios-ipa"
  | "ios-archive"
  | "other";

export interface GitHubReleaseAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  content_type?: string;
  updated_at?: string;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets: GitHubReleaseAsset[];
}

export interface ClassifiedArtifact {
  kind: ArtifactKind;
  platform: "android" | "ios" | "other";
  label: string;
  sub: string;
  asset: GitHubReleaseAsset;
}

export const classifyAsset = (asset: GitHubReleaseAsset): ClassifiedArtifact => {
  const name = asset.name.toLowerCase();

  if (name.endsWith(".apk")) {
    return {
      kind: "android-apk",
      platform: "android",
      label: "Download APK",
      sub: "Android — direct install",
      asset,
    };
  }
  if (name.endsWith(".aab")) {
    return {
      kind: "android-aab",
      platform: "android",
      label: "Download AAB",
      sub: "Android — Play Store bundle",
      asset,
    };
  }
  if (name.endsWith(".ipa")) {
    return {
      kind: "ios-ipa",
      platform: "ios",
      label: "Download iOS build",
      sub: "iOS — installable (IPA)",
      asset,
    };
  }
  if (name.includes(".xcarchive")) {
    return {
      kind: "ios-archive",
      platform: "ios",
      label: "Download iOS archive",
      sub: "iOS — for signing & submission",
      asset,
    };
  }
  return {
    kind: "other",
    platform: "other",
    label: asset.name,
    sub: "Additional build file",
    asset,
  };
};

const KIND_ORDER: ArtifactKind[] = [
  "android-apk",
  "ios-ipa",
  "android-aab",
  "ios-archive",
  "other",
];

export const classifyRelease = (release: GitHubRelease): ClassifiedArtifact[] =>
  (release.assets ?? [])
    .map(classifyAsset)
    .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));

/** Best single download per platform: APK for Android, IPA (else archive) for iOS. */
export const pickRecommended = (artifacts: ClassifiedArtifact[]) => ({
  android:
    artifacts.find((a) => a.kind === "android-apk") ??
    artifacts.find((a) => a.kind === "android-aab"),
  ios:
    artifacts.find((a) => a.kind === "ios-ipa") ??
    artifacts.find((a) => a.kind === "ios-archive"),
});

export const formatBytes = (bytes: number) => {
  if (!bytes || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const formatReleaseDate = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
