import { Apple, Download, Monitor, Package, RefreshCw, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestRelease } from "@/hooks/useLatestRelease";
import {
  classifyRelease,
  formatBytes,
  formatReleaseDate,
  pickRecommended,
  sortForPlatform,
  type ClassifiedArtifact,
} from "@/lib/releaseAssets";
import { releasesPageUrl } from "@/config/appStores";
import { usePlatform, type PlatformOs } from "@/hooks/usePlatform";

const iconFor = (artifact: ClassifiedArtifact) => {
  if (artifact.platform === "ios") return <Apple className="h-5 w-5" />;
  if (artifact.kind === "windows-zip") return <Monitor className="h-5 w-5" />;
  if (artifact.kind === "android-apk") return <Download className="h-5 w-5" />;
  if (artifact.kind === "android-aab") return <Package className="h-5 w-5" />;
  return <Smartphone className="h-5 w-5" />;
};

const ArtifactRow = ({ artifact }: { artifact: ClassifiedArtifact }) => (
  <Button
    asChild
    variant="outline"
    className="h-auto w-full justify-start gap-3 px-4 py-3"
  >
    <a href={artifact.asset.browser_download_url} rel="noopener noreferrer">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {iconFor(artifact)}
      </span>
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="text-xs text-muted-foreground">{artifact.sub}</span>
        <span className="truncate text-sm font-semibold">{artifact.label}</span>
      </span>
      {artifact.asset.size > 0 && (
        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
          {formatBytes(artifact.asset.size)}
        </Badge>
      )}
    </a>
  </Button>
);

interface BuildDownloadsProps {
  /** Only show the recommended build(s) */
  compact?: boolean;
  /** Hide the heading row (when the parent already has one) */
  hideHeading?: boolean;
  /** Override the detected OS (e.g. "show all platforms" toggles) */
  platform?: PlatformOs;
}

const BuildDownloads = ({ compact, hideHeading, platform }: BuildDownloadsProps) => {
  const { status, release, refetch, isRefetching } = useLatestRelease();
  const detected = usePlatform();
  const os = platform ?? detected.os;

  const artifacts = release ? sortForPlatform(classifyRelease(release), os) : [];
  const recommended = pickRecommended(artifacts);
  const compactPicks =
    os === "android"
      ? [recommended.android]
      : os === "ios"
        ? [recommended.ios]
        : [recommended.android, recommended.ios];
  const shown = compact
    ? (compactPicks.filter(Boolean) as ClassifiedArtifact[])
    : artifacts;


  const note = (text: string) => (
    <p className="text-sm text-muted-foreground">{text}</p>
  );

  return (
    <div className="w-full text-left">
      {!hideHeading && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Build &amp; Download</h3>
            {release && (
              <Badge variant="secondary" className="text-[10px]">
                {release.tag_name}
              </Badge>
            )}
          </div>
          {status !== "not-configured" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw
                className={`mr-2 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          )}
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      )}

      {status === "not-configured" &&
        note(
          "Build downloads aren't linked yet. Once the project is exported to GitHub and the repository is set in the app config, the latest APK, AAB and iOS builds appear here automatically.",
        )}

      {status === "no-release" && (
        <div className="space-y-3">
          {note(
            "The installable builds are being prepared. As soon as the next release is published, the APK and iOS files appear here automatically.",
          )}
          {releasesPageUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={releasesPageUrl} target="_blank" rel="noopener noreferrer">
                View releases on GitHub
              </a>
            </Button>
          )}
        </div>
      )}


      {status === "error" && (
        <div className="space-y-3">
          {note("Couldn't reach GitHub to read the latest release.")}
          {releasesPageUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={releasesPageUrl} target="_blank" rel="noopener noreferrer">
                Open releases page
              </a>
            </Button>
          )}
        </div>
      )}

      {status === "ready" && release && (
        <div className="space-y-3">
          {release.published_at && !hideHeading && (
            <p className="text-xs text-muted-foreground">
              Released {formatReleaseDate(release.published_at)}
            </p>
          )}
          {shown.length === 0
            ? note(
                os === "ios"
                  ? "No installable iOS build is attached to the latest release yet. You can add the web app to your Home Screen in the meantime."
                  : "The latest release has no build files attached yet. Re-run the mobile build workflow to attach the APK, AAB and iOS artifacts.",
              )
            : shown.map((artifact) => (
                <ArtifactRow key={artifact.asset.id} artifact={artifact} />
              ))}
          {shown.length > 0 && os === "android" && (
            <p className="text-xs text-muted-foreground">
              Tap the APK, then allow installs from unknown apps for your browser.
            </p>
          )}
          {shown.length > 0 && os === "ios" && (
            <p className="text-xs text-muted-foreground">
              iOS builds install with a sideloading tool (AltStore or Sideloadly) from a
              computer.
            </p>
          )}
        </div>
      )}

    </div>
  );
};

export default BuildDownloads;
