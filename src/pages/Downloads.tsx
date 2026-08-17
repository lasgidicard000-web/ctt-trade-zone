import { useState } from "react";
import { Link } from "react-router-dom";
import { Apple, Monitor, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BuildDownloads from "@/components/BuildDownloads";
import { APP_NAME } from "@/config/appStores";
import { usePlatform } from "@/hooks/usePlatform";

const AndroidInstructions = ({ highlighted }: { highlighted?: boolean }) => (
  <Card
    className={`bg-card p-5 ${highlighted ? "border-primary/60 ring-1 ring-primary/30" : "border-border"}`}
  >
    <div className="mb-2 flex items-center gap-2">
      <Smartphone className="h-4 w-4 text-primary" />
      <h2 className="text-lg font-semibold">Installing on Android</h2>
      {highlighted && (
        <Badge variant="secondary" className="text-[10px]">
          Your device
        </Badge>
      )}
    </div>
    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      <li>Download the <strong>APK</strong> file above on your phone.</li>
      <li>When prompted, allow installs from unknown apps for your browser.</li>
      <li>Open the downloaded file and tap Install.</li>
    </ol>
    <p className="mt-3 text-xs text-muted-foreground">
      The <strong>AAB</strong> bundle is only for uploading to Google Play — it cannot be
      installed directly.
    </p>
  </Card>
);

const IosInstructions = ({ highlighted }: { highlighted?: boolean }) => (
  <Card
    className={`bg-card p-5 ${highlighted ? "border-primary/60 ring-1 ring-primary/30" : "border-border"}`}
  >
    <div className="mb-2 flex items-center gap-2">
      <Apple className="h-4 w-4 text-primary" />
      <h2 className="text-lg font-semibold">Installing on iOS</h2>
      {highlighted && (
        <Badge variant="secondary" className="text-[10px]">
          Your device
        </Badge>
      )}
    </div>
    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      <li>Download the <strong>IPA</strong> file if one is listed.</li>
      <li>Install it with a sideloading tool (AltStore or Sideloadly) on a computer.</li>
      <li>
        Trust the developer profile under Settings → General → VPN &amp; Device
        Management.
      </li>
    </ol>
    <p className="mt-3 text-xs text-muted-foreground">
      No IPA yet? Open this site in Safari and tap Share → <strong>Add to Home Screen</strong>{" "}
      to use it like an app.
    </p>
  </Card>
);

const WindowsInstructions = ({ highlighted }: { highlighted?: boolean }) => (
  <Card
    className={`bg-card p-5 ${highlighted ? "border-primary/60 ring-1 ring-primary/30" : "border-border"}`}
  >
    <div className="mb-2 flex items-center gap-2">
      <Monitor className="h-4 w-4 text-primary" />
      <h2 className="text-lg font-semibold">Installing on Windows</h2>
      {highlighted && (
        <Badge variant="secondary" className="text-[10px]">
          Your device
        </Badge>
      )}
    </div>
    <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
      <li>Download the <strong>Windows ZIP</strong> above.</li>
      <li>Right-click the file → Extract All.</li>
      <li>
        Open the extracted folder and run <strong>ctttradezone.exe</strong>.
      </li>
    </ol>
    <p className="mt-3 text-xs text-muted-foreground">
      Windows SmartScreen may warn about an unknown publisher — choose More info → Run
      anyway. The build is portable, so no installer or admin rights are required.
    </p>
  </Card>
);

const Downloads = () => {
  const { os, label } = usePlatform();
  const [showAll, setShowAll] = useState(false);

  const detected = os === "android" || os === "ios" || os === "windows";
  const expanded = showAll || !detected;

  return (
    <div className="min-h-screen bg-background">
      <title>Download the ctttradezone App (APK, iOS & Windows)</title>
      <meta
        name="description"
        content="Download the latest ctttradezone Android APK, Play Store bundle, iOS build and Windows desktop app straight from the newest release, with install steps."
      />

      <section className="container mx-auto max-w-3xl px-4 py-12">
        <Badge variant="secondary" className="mb-4">
          Mobile &amp; desktop builds
        </Badge>
        <h1 className="mb-3 text-3xl font-bold">Download the {APP_NAME} app</h1>
        <p className="mb-6 text-muted-foreground">
          These files come straight from the newest published release, so this page is
          always up to date with the latest build.
        </p>

        {detected && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Looks like you're on <strong className="text-foreground">{label}</strong> —
              showing the builds and steps for your device.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show my device only" : "Show all platforms"}
            </Button>
          </div>
        )}

        <Card className="mb-8 border-border bg-card p-5">
          <BuildDownloads platform={expanded ? "desktop" : os} />
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {os === "ios" ? (
            <>
              <IosInstructions highlighted />
              {expanded && <AndroidInstructions />}
              {expanded && <WindowsInstructions />}
            </>
          ) : os === "windows" ? (
            <>
              <WindowsInstructions highlighted />
              {expanded && <AndroidInstructions />}
              {expanded && <IosInstructions />}
            </>
          ) : (
            <>
              <AndroidInstructions highlighted={os === "android"} />
              {(expanded || os !== "android") && <IosInstructions />}
              <WindowsInstructions />
            </>
          )}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Prefer the browser?{" "}
          <Link to="/" className="text-primary underline">
            Use the web app
          </Link>{" "}
          — it works fully on any mobile device.
        </p>
      </section>
    </div>
  );
};

export default Downloads;
