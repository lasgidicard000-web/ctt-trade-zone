import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Fuel, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useFieldMarshalUpgrade } from "@/hooks/useFieldMarshalUpgrade";

export const TRON_GAS_ADDRESS = "TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L";

/** Gas fee section shown at the top of Field Marshal dashboards — TRON only. */
export const TronGasFeeSection = ({ userId }: { userId?: string }) => {
  const { status } = useFieldMarshalUpgrade(userId) as any;
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(TRON_GAS_ADDRESS, { width: 160, margin: 1 }).then(setQr).catch(() => {});
  }, []);

  if (!userId || status === "loading" || status === "not-member") return null;

  const copy = async () => {
    await navigator.clipboard.writeText(TRON_GAS_ADDRESS);
    setCopied(true);
    toast.success("TRON gas fee address copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-6 overflow-hidden border-destructive/40 bg-gradient-to-br from-destructive/10 via-card to-card p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {qr && (
          <img src={qr} alt="TRON gas fee address QR code" className="h-32 w-32 shrink-0 rounded-md bg-background p-1" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Fuel className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Gas Fee — Field Marshal</h2>
            <Badge variant="destructive">TRON ONLY</Badge>
          </div>
          <p className="flex items-start gap-2 text-sm font-medium">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            Only TRON (TRX / TRC-20) is accepted here. Sending any other coin or network will be lost.
          </p>
          <p className="text-sm text-muted-foreground">
            Gas fees paid here are used for converting BTC funds in your dashboard and for USDT withdrawals to external wallets.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-muted px-2 py-1 text-xs">{TRON_GAS_ADDRESS}</code>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
