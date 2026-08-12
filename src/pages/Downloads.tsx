import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BuildDownloads from "@/components/BuildDownloads";
import { APP_NAME } from "@/config/appStores";

const Downloads = () => {
  return (
    <div className="min-h-screen bg-background">
      <title>Download the ctttradezone App (APK & iOS Builds)</title>
      <meta
        name="description"
        content="Download the latest ctttradezone Android APK, Play Store bundle and iOS build straight from the newest release, with install instructions."
      />

      <section className="container mx-auto max-w-3xl px-4 py-12">
        <Badge variant="secondary" className="mb-4">
          Mobile builds
        </Badge>
        <h1 className="mb-3 text-3xl font-bold">Download the {APP_NAME} app</h1>
        <p className="mb-8 text-muted-foreground">
          These files come straight from the newest published release, so this page is
          always up to date with the latest build.
        </p>

        <Card className="mb-8 border-border bg-card p-5">
          <BuildDownloads />
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card p-5">
            <h2 className="mb-2 text-lg font-semibold">Installing on Android</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Download the <strong>APK</strong> file above on your phone.</li>
              <li>
                When prompted, allow installs from unknown apps for your browser.
              </li>
              <li>Open the downloaded file and tap Install.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              The <strong>AAB</strong> bundle is only for uploading to Google Play — it
              cannot be installed directly.
            </p>
          </Card>

          <Card className="border-border bg-card p-5">
            <h2 className="mb-2 text-lg font-semibold">Installing on iOS</h2>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Download the <strong>IPA</strong> file if one is listed.</li>
              <li>
                Install it with a sideloading tool (AltStore or Sideloadly) on a
                computer.
              </li>
              <li>
                Trust the developer profile under Settings → General → VPN &amp; Device
                Management.
              </li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              The <strong>.xcarchive</strong> is for signing and App Store submission
              with an Apple Developer account.
            </p>
          </Card>
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
