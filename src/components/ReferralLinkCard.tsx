import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { useReferralStats } from "@/hooks/useReferralStats";
import {
  Copy,
  Check,
  Share2,
  Mail,
  MessageCircle,
  Send,
  Twitter,
  Facebook,
  Smartphone,
  Download,
  MousePointerClick,
  UserPlus,
  Gift,
} from "lucide-react";

interface Props {
  userId: string;
  className?: string;
}

export const ReferralLinkCard = ({ userId, className }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const { stats, events } = useReferralStats(userId);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ctttradezone.com";
  const link = `${origin}/auth?ref=${userId}`;
  const message = `Join me on CTT Trade Zone and start earning daily trading returns. Sign up with my referral link: ${link}`;
  const enc = encodeURIComponent(message);
  const encLink = encodeURIComponent(link);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 320, margin: 1 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Referral link copied", description: "Share it anywhere to earn $10 USDT." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard unavailable", variant: "destructive" });
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = "ctt-referral-qr.png";
    a.click();
    toast({ title: "QR code downloaded", description: "Share the image anywhere you like." });
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "CTT Trade Zone", text: message, url: link });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  const targets = [
    { label: "WhatsApp", icon: MessageCircle, url: `https://wa.me/?text=${enc}` },
    { label: "Telegram", icon: Send, url: `https://t.me/share/url?url=${encLink}&text=${enc}` },
    { label: "X", icon: Twitter, url: `https://twitter.com/intent/tweet?text=${enc}` },
    { label: "Facebook", icon: Facebook, url: `https://www.facebook.com/sharer/sharer.php?u=${encLink}` },
    { label: "Email", icon: Mail, url: `mailto:?subject=${encodeURIComponent("Join me on CTT Trade Zone")}&body=${enc}` },
    { label: "SMS", icon: Smartphone, url: `sms:?&body=${enc}` },
  ];

  const oneTapShare = (label: string, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    toast({ title: `Sharing via ${label}`, description: "Your invite message is pre-filled." });
  };

  const eventIcon = (kind: string) =>
    kind === "click" ? MousePointerClick : kind === "signup" ? UserPlus : Gift;

  return (
    <Card className={`border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5 ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-extrabold uppercase tracking-wide">Your referral link</h2>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 rounded-xl border border-primary/30 bg-background/70 p-3">
          <p className="break-all text-base font-extrabold leading-snug text-primary sm:text-lg">{link}</p>
        </div>
        {qr && (
          <div className="flex flex-col items-center gap-2">
            <img
              src={qr}
              alt="QR code for your CTT Trade Zone referral link"
              className="h-28 w-28 rounded-xl border border-primary/30 bg-white p-1"
            />
            <Button size="sm" variant="outline" onClick={downloadQr} className="text-xs font-semibold">
              <Download className="mr-1 h-3.5 w-3.5" /> Download QR
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={copy} className="flex-1 font-bold">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button onClick={nativeShare} variant="outline" className="flex-1 font-bold">
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {targets.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => oneTapShare(t.label, t.url)}
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 p-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Link clicks</p>
          <p className="text-xl font-extrabold tabular-nums">{stats.clicks}</p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Signups</p>
          <p className="text-xl font-extrabold tabular-nums">{stats.signups}</p>
        </div>
        <div className="rounded-lg border border-border bg-background/60 p-3 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rewards</p>
          <p className="text-xl font-extrabold tabular-nums">${stats.rewardsTotal.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">{stats.rewardsPending} pending</p>
        </div>
      </div>

      {events.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background/50">
          {events.map((e) => {
            const Icon = eventIcon(e.kind);
            return (
              <li key={e.id} className="flex items-center gap-2 p-2.5 text-xs">
                <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-medium">{e.label}</span>
                {e.amount !== undefined && (
                  <span className="font-semibold text-emerald-500 tabular-nums">+${e.amount.toFixed(2)}</span>
                )}
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {new Date(e.created_at).toLocaleDateString()}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-lg border border-border bg-background/50 p-3 text-xs text-muted-foreground">
          No referral activity yet — share your link or QR code to start earning.
        </p>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        You earn $10 USDT for every friend who signs up with your link.
      </p>
    </Card>
  );
};
