import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Share2, Mail, MessageCircle, Send, Twitter, Facebook, Smartphone } from "lucide-react";

interface Props {
  userId: string;
  className?: string;
}

export const ReferralLinkCard = ({ userId, className }: Props) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://ctttradezone.com";
  const link = `${origin}/auth?ref=${userId}`;
  const message = `Join me on CTT Trade Zone and start earning daily trading returns. Sign up with my referral link: ${link}`;
  const enc = encodeURIComponent(message);
  const encLink = encodeURIComponent(link);

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

  return (
    <Card className={`border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-5 ${className ?? ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <Share2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-extrabold uppercase tracking-wide">Your referral link</h2>
      </div>

      <div className="rounded-xl border border-primary/30 bg-background/70 p-3">
        <p className="break-all text-base font-extrabold leading-snug text-primary sm:text-lg">{link}</p>
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
          <a
            key={t.label}
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background/60 p-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </a>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        You earn $10 USDT for every friend who signs up with your link.
      </p>
    </Card>
  );
};
