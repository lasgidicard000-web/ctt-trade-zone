import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import { Clock, Copy, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FIXED_BTC_ADDRESS } from "@/components/WalletAddresses";
import { planBadgeAlt, planBadgeUrl } from "@/lib/planBadges";
import { useFieldMarshalUpgrade } from "@/hooks/useFieldMarshalUpgrade";

interface Props {
  userId: string;
  children: React.ReactNode;
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Gates the Field Marshal premium dashboard behind the one-time $500 BTC
 * upgrade deposit. Members without the deposit see a locked card with the
 * BTC address and a "I've sent the deposit" request; admin confirmation
 * unlocks the premium content.
 */
export const PremiumAccessGate = ({ userId, children }: Props) => {
  const { status, record, requestUpgrade } = useFieldMarshalUpgrade(userId);
  const [qr, setQr] = useState("");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);
  const badge = planBadgeUrl("field");

  useEffect(() => {
    QRCode.toDataURL(FIXED_BTC_ADDRESS, { width: 180, margin: 1 })
      .then(setQr)
      .catch(() => {});
  }, []);

  const submit = async () => {
    setBusy(true);
    try {
      await requestUpgrade(txHash.trim() || undefined);
      toast.success("Request submitted", {
        description: "Your $500 upgrade deposit is awaiting admin confirmation.",
      });
      setTxHash("");
    } catch (e: any) {
      if (e?.code === "23505") {
        toast.info("You already have an upgrade request under review.");
      } else {
        toast.error(e?.message || "Could not submit the request");
      }
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading") return null;
  // Non Field Marshal members pass through (the wrapped card hides itself);
  // confirmed members see the premium content as normal.
  if (status === "not-member" || status === "confirmed") return <>{children}</>;

  if (status === "pending") {
    return (
      <Card className="mb-6 border-amber-500/30 bg-amber-500/5 p-5">
        <div className="mb-3 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-[11px] font-semibold uppercase text-amber-300">
              Field Marshal premium dashboard
            </p>
            <h3 className="font-semibold">Upgrade deposit under review</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Your ${usd(record?.amount_usd ?? 500)} upgrade deposit request
          {record?.created_at ? ` (submitted ${format(new Date(record.created_at), "d MMM yyyy, HH:mm")})` : ""} is
          awaiting admin confirmation. Your premium dashboard unlocks as soon as the deposit is verified.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden border-amber-500/30 bg-gradient-to-br from-red-950/30 to-amber-500/5 p-5">
      <div className="mb-2 flex items-center gap-3">
        {badge && (
          <img
            src={badge}
            alt={planBadgeAlt("Field Marshal")}
            loading="lazy"
            width={1024}
            height={1024}
            className="h-12 w-12 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          />
        )}
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" />
          <div>
            <p className="text-[11px] font-semibold uppercase text-amber-300">
              Field Marshal premium dashboard
            </p>
            <h3 className="font-semibold">Premium dashboard locked</h3>
          </div>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        A one-time <strong className="text-foreground">$500 BTC upgrade deposit</strong> is required to
        access the premium dashboard reserved for Field Marshal plan members. Send the deposit to the
        address below, then submit your request — an admin verifies the deposit and unlocks your premium
        dashboard.
      </p>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        {qr && (
          <img
            src={qr}
            alt="BTC deposit address QR code"
            className="h-28 w-28 shrink-0 rounded-lg bg-white p-1"
          />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="rounded-lg bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Required upgrade deposit</p>
            <p className="text-lg font-semibold tabular-nums">${usd(500)}</p>
          </div>
          <div className="rounded-lg bg-background/60 p-3">
            <p className="mb-1 text-xs text-muted-foreground">BTC deposit address</p>
            <p className="break-all font-mono text-xs">{FIXED_BTC_ADDRESS}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                navigator.clipboard.writeText(FIXED_BTC_ADDRESS);
                toast.success("BTC address copied");
              }}
            >
              <Copy className="mr-1 h-3 w-3" /> Copy address
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs text-muted-foreground">Transaction hash (optional)</p>
          <Input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Paste your BTC transaction hash"
          />
        </div>
        <Button onClick={submit} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
          I've sent the deposit
        </Button>
      </div>
    </Card>
  );
};
