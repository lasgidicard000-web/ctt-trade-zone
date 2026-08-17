import { Link } from "react-router-dom";
import { Apple, Smartphone, Download, Github, Monitor, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import BuildDownloads from "@/components/BuildDownloads";
import { usePlatform } from "@/hooks/usePlatform";
import { useLatestRelease } from "@/hooks/useLatestRelease";
import {
  classifyRelease,
  formatBytes,
  pickRecommended,
  WINDOWS_INSTALL_STEPS,
  type ClassifiedArtifact,
} from "@/lib/releaseAssets";
import {
  APP_NAME,
  appStoreUrl,
  googlePlayUrl,
  releasesPageUrl,
} from "@/config/appStores";

interface GetTheAppSectionProps {
  /** Compact rendering for use inside dashboards */
  compact?: boolean;
}

const LinkButton = ({
  href,
  icon,
  label,
  sub,
  badge,
  primary,
  compact,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  badge?: string;
  primary?: boolean;
  compact?: boolean;
}) => (
  <Button
    asChild
    variant={primary ? "default" : "outline"}
    className={`h-auto w-full justify-start gap-3 px-4 py-3 ${compact ? "" : "sm:w-auto sm:min-w-[240px]"}`}
  >
    <a href={href} target="_blank" rel="noopener noreferrer">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${primary ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"}`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className={`text-xs ${primary ? "opacity-80" : "text-muted-foreground"}`}>
          {sub}
        </span>
        <span className="truncate text-sm font-semibold">{label}</span>
      </span>
      {badge && (
        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
          {badge}
        </Badge>
      )}
    </a>
  </Button>
);

const GetTheAppSection = ({ compact }: GetTheAppSectionProps) => {
  const { os, label } = usePlatform();
  const { status, release } = useLatestRelease();

  const artifacts: ClassifiedArtifact[] = release ? classifyRelease(release) : [];
  const recommended = pickRecommended(artifacts);
  const aab = artifacts.find((a) => a.kind === "android-aab");
  const buildsReady =
    status === "ready" &&
    (recommended.android || recommended.ios || recommended.windows);

  const androidDownload = recommended.android ? (
    <LinkButton
      key="android-dl"
      href={recommended.android.asset.browser_download_url}
      icon={<Download className="h-5 w-5" />}
      label={recommended.android.kind === "android-apk" ? "Download APK" : "Download AAB"}
      sub="Android — direct install"
      badge={formatBytes(recommended.android.asset.size) || undefined}
      primary={os !== "ios"}
      compact={compact}
    />
  ) : null;

  const iosDownload = recommended.ios ? (
    <LinkButton
      key="ios-dl"
      href={recommended.ios.asset.browser_download_url}
      icon={<Apple className="h-5 w-5" />}
      label={
        recommended.ios.kind === "ios-ipa"
          ? "Download iOS build (.ipa)"
          : "Download iOS archive"
      }
      sub="iOS — iPhone & iPad"
      badge={formatBytes(recommended.ios.asset.size) || undefined}
      primary={os === "ios"}
      compact={compact}
    />
  ) : null;

  const windowsDownload = recommended.windows ? (
    <LinkButton
      key="windows-dl"
      href={recommended.windows.asset.browser_download_url}
      icon={<Monitor className="h-5 w-5" />}
      label={recommended.windows.label}
      sub="Windows — desktop app"
      badge={formatBytes(recommended.windows.asset.size) || undefined}
      primary={os === "windows"}
      compact={compact}
    />
  ) : releasesPageUrl ? (
    <LinkButton
      key="windows-pending"
      href={releasesPageUrl}
      icon={<Monitor className="h-5 w-5" />}
      label="Windows build — coming in next release"
      sub="Windows — desktop app"
      badge="Preparing"
      compact={compact}
    />
  ) : null;


  const playButton = googlePlayUrl ? (
    <LinkButton
      key="play"
      href={googlePlayUrl}
      icon={<Smartphone className="h-5 w-5" />}
      label="Google Play"
      sub="Android — store listing"
      compact={compact}
    />
  ) : null;

  const appStoreButton = appStoreUrl ? (
    <LinkButton
      key="appstore"
      href={appStoreUrl}
      icon={<Apple className="h-5 w-5" />}
      label="App Store"
      sub="iOS — store listing"
      compact={compact}
    />
  ) : null;

  const aabButton =
    aab && os !== "android" && os !== "ios" ? (
      <LinkButton
        key="aab"
        href={aab.asset.browser_download_url}
        icon={<Package className="h-5 w-5" />}
        label="Download AAB (Play upload)"
        sub="Android — Play Store bundle"
        badge={formatBytes(aab.asset.size) || undefined}
        compact={compact}
      />
    ) : null;

  const releasesButton = releasesPageUrl ? (
    <LinkButton
      key="releases"
      href={releasesPageUrl}
      icon={<Github className="h-5 w-5" />}
      label="View releases on GitHub"
      sub="Latest builds"
      compact={compact}
    />
  ) : null;

  const androidGroup = [androidDownload, playButton].filter(Boolean);
  const iosGroup = [iosDownload, appStoreButton].filter(Boolean);

  const ordered = buildsReady
    ? (os === "ios"
        ? [...iosGroup, ...androidGroup, windowsDownload, aabButton]
        : os === "windows"
          ? [windowsDownload, ...androidGroup, ...iosGroup, aabButton]
          : [...androidGroup, ...iosGroup, windowsDownload, aabButton]
      ).filter(Boolean)
    : [playButton, appStoreButton, windowsDownload, releasesButton].filter(Boolean);


  const buttons = ordered.length ? (
    <div
      className={`flex flex-col gap-3 ${compact ? "" : "sm:flex-row sm:flex-wrap sm:justify-center"}`}
    >
      {ordered.map((btn, i) => (
        <div key={i} className={compact ? "" : "sm:w-auto"}>
          {btn}
        </div>
      ))}
    </div>
  ) : null;

  const detectedNote =
    os === "android" || os === "ios" || os === "windows" ? (
      <p className={`text-xs text-muted-foreground ${compact ? "mt-3" : "mt-4"}`}>
        Looks like you're on {label} — the matching build is shown first.
      </p>
    ) : null;

  const windowsSteps = (
    <div
      className={`rounded-lg border border-border bg-muted/40 p-3 text-left ${compact ? "mt-3" : "mx-auto mt-6 max-w-xl"}`}
    >
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold">
        <Monitor className="h-3.5 w-3.5 text-primary" />
        Installing on Windows
      </p>
      <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
        {WINDOWS_INSTALL_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Portable build — no installer or admin rights needed. If SmartScreen warns, choose
        More info → Run anyway.
      </p>
    </div>
  );

  const pendingNote = !buildsReady ? (
    <p className={`text-xs text-muted-foreground ${compact ? "mt-3" : "mt-4"}`}>
      The installable builds are being prepared — they appear here automatically as soon
      as the next release finishes.
    </p>
  ) : null;


  if (compact) {
    return (
      <Card className="border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Get the {APP_NAME} app</h3>
        </div>
        {buttons}
        {detectedNote}
        {pendingNote}
        <div className="mt-4 border-t border-border pt-4">
          <BuildDownloads compact />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <Link to="/downloads" className="text-primary underline">
            All build downloads &amp; install steps
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <section className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Mobile &amp; desktop
        </Badge>
        <h2 className="mb-3 text-3xl font-bold">Get the {APP_NAME} app</h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Trade, redeem and manage your portfolio anywhere. Download for Android, iOS or
          Windows.
        </p>
        {buttons}
        {detectedNote}
        {pendingNote}
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-card p-5">
          <BuildDownloads />
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground">
          <Link to="/downloads" className="text-primary underline">
            See all builds and install instructions
          </Link>
        </p>
      </div>
    </section>
  );
};

export default GetTheAppSection;
