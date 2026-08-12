import { Link } from "react-router-dom";
import { Apple, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import BuildDownloads from "@/components/BuildDownloads";
import { usePlatform } from "@/hooks/usePlatform";
import {
  APP_NAME,
  appStoreUrl,
  googlePlayUrl,
} from "@/config/appStores";

interface GetTheAppSectionProps {
  /** Compact rendering for use inside dashboards */
  compact?: boolean;
}


const StoreButton = ({
  href,
  icon,
  label,
  sub,
  compact,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  compact?: boolean;
}) => {
  const available = href.length > 0;

  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs text-muted-foreground">{sub}</span>
        <span className="text-sm font-semibold">{label}</span>
      </span>
      {!available && (
        <Badge variant="secondary" className="ml-auto text-[10px]">
          Coming soon
        </Badge>
      )}
    </>
  );

  if (!available) {
    return (
      <Button
        variant="outline"
        disabled
        className={`h-auto w-full justify-start gap-3 px-4 py-3 ${compact ? "" : "sm:w-auto sm:min-w-[240px]"}`}
      >
        {inner}
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      className={`h-auto w-full justify-start gap-3 px-4 py-3 ${compact ? "" : "sm:w-auto sm:min-w-[240px]"}`}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    </Button>
  );
};

const GetTheAppSection = ({ compact }: GetTheAppSectionProps) => {
  const storeAvailable = googlePlayUrl.length > 0 || appStoreUrl.length > 0;
  const { os, label } = usePlatform();

  const android = (
    <StoreButton
      href={googlePlayUrl}
      icon={<Smartphone className="h-5 w-5" />}
      label="Google Play"
      sub="Android — store listing"
      compact={compact}
    />
  );
  const ios = (
    <StoreButton
      href={appStoreUrl}
      icon={<Apple className="h-5 w-5" />}
      label="App Store"
      sub="iOS — iPhone & iPad"
      compact={compact}
    />
  );

  const ordered =
    os === "ios" ? [ios, android] : os === "android" ? [android, ios] : [android, ios];

  const buttons = (
    <div className={`flex flex-col gap-3 ${compact ? "" : "sm:flex-row sm:flex-wrap sm:justify-center"}`}>
      {ordered.map((btn, i) => (
        <div key={i} className={compact ? "" : "sm:w-auto"}>
          {btn}
        </div>
      ))}
    </div>
  );

  const detectedNote =
    os === "android" || os === "ios" ? (
      <p className={`text-xs text-muted-foreground ${compact ? "mt-3" : "mt-4"}`}>
        Looks like you're on {label} — the matching build is shown first.
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
        <div className="mt-4 border-t border-border pt-4">
          <BuildDownloads compact />
        </div>
        {!storeAvailable && (
          <p className="mt-3 text-xs text-muted-foreground">
            Store listings are on the way.{" "}
            <Link to="/downloads" className="text-primary underline">
              All build downloads
            </Link>
          </p>
        )}
      </Card>
    );
  }

  return (
    <section className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Mobile
        </Badge>
        <h2 className="mb-3 text-3xl font-bold">Get the {APP_NAME} app</h2>
        <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
          Trade, redeem and manage your portfolio on the go. Download for Android or iOS.
        </p>
        {buttons}
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-card p-5">
          <BuildDownloads />
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-muted-foreground">
          {!storeAvailable && "Store listings are being prepared. "}
          <Link to="/downloads" className="text-primary underline">
            See all builds and install instructions
          </Link>
        </p>
      </div>
    </section>
  );
};


export default GetTheAppSection;
