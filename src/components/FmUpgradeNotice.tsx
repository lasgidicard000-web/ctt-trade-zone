import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FIXED_BTC_ADDRESS } from "@/components/WalletAddresses";
import { planBadgeAlt, planBadgeUrl } from "@/lib/planBadges";

interface Props {
  onOpenSignup?: () => void;
  className?: string;
}

/**
 * Public login-page notice: a $500 BTC upgrade deposit is required to access
 * the premium dashboard reserved for Field Marshal plan members. Shows the
 * deposit address with a copy button and QR code.
 */
export const FmUpgradeNotice = ({ onOpenSignup, className }: Props) => {
  const [qr, setQr] = useState("");
  const badge = planBadgeUrl("field");

  useEffect(() => {
    QRCode.toDataURL(FIXED_BTC_ADDRESS, { width: 140, margin: 1 })
      .then(setQr)
      .catch(() => {});
  }, []);

  return (
    <Card className={`w-full max-w-md border-amber-500/30 bg-gradient-to-br from-red-950/30 to-amber-500/5 p-5 ${className ?? ""}`}>
      <div className="mb-2 flex items-center gap-3">
        {badge && (
          <img
            src={badge}
            alt={planBadgeAlt("Field Marshal")}
            loading="lazy"
            width={1024}
            height={1024}
            className="h-10 w-10 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          />
        )}
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <p className="text-[11px] font-semibold uppercase text-amber-300">
            Field Marshal Plan — Premium Dashboard Access
          </p>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        A one-time <strong className="text-foreground">$500 BTC upgrade deposit</strong> is required
        to access the premium dashboard reserved for Field Marshal plan members. Send the deposit to
        the address below — an admin verifies it and unlocks your premium dashboard.
      </p>
      <div className="flex items-start gap-3">
        {qr && <img src={qr} alt="BTC deposit address QR code" className="h-24 w-24 shrink-0 rounded-lg bg-white p-1" />}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="rounded-lg bg-background/60 p-3">
            <p className="mb-1 text-xs text-muted-foreground">BTC deposit address</p>
            <p className="break-all font-mono text-xs">{FIXED_BTC_ADDRESS}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(FIXED_BTC_ADDRESS);
                toast.success("BTC address copied");
              }}
            >
              <Copy className="mr-1 h-3 w-3" /> Copy address
            </Button>
            {onOpenSignup && (
              <Button size="sm" onClick={onOpenSignup}>
                Open a Field Marshal account
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
