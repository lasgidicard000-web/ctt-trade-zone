import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Copy, Download, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { generateDepositReceipt } from "@/lib/depositReceipt";

export interface DepositReceiptDeposit {
  id: string;
  coin_symbol: string;
  wallet_address: string;
  amount: number;
  transaction_hash: string | null;
  confirmation_status: string;
  confirmations: number;
  created_at: string;
  confirmed_at: string | null;
  notes: string | null;
}

interface DepositReceiptDialogProps {
  deposit: DepositReceiptDeposit;
  accountName: string;
  accountEmail: string;
  usdRate: number | null;
  triggerLabel?: string;
}

const fmtUsd = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const DepositReceiptDialog = ({
  deposit,
  accountName,
  accountEmail,
  usdRate,
  triggerLabel = "Receipt",
}: DepositReceiptDialogProps) => {
  const [open, setOpen] = useState(false);

  const amount = Number(deposit.amount);
  const usdValue = usdRate ? amount * usdRate : null;
  const referenceId = `CTT-DEP-${deposit.id.slice(0, 8).toUpperCase()}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const download = () => {
    try {
      generateDepositReceipt({
        id: deposit.id,
        coinSymbol: deposit.coin_symbol,
        amount,
        walletAddress: deposit.wallet_address,
        transactionHash: deposit.transaction_hash,
        status: deposit.confirmation_status,
        confirmations: deposit.confirmations,
        createdAt: deposit.created_at,
        confirmedAt: deposit.confirmed_at,
        notes: deposit.notes,
        usdRate,
        accountName,
        accountEmail,
      });
      toast.success("Receipt downloaded");
    } catch (error) {
      console.error("Receipt generation failed:", error);
      toast.error("Could not generate receipt");
    }
  };

  const Row = ({
    label,
    value,
    mono,
    onCopy,
  }: {
    label: string;
    value: string;
    mono?: boolean;
    onCopy?: () => void;
  }) => (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="flex items-start gap-2 text-right">
        <span className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground mt-0.5"
            aria-label={`Copy ${label}`}
          >
            <Copy className="w-3 h-3" />
          </button>
        )}
      </span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="w-3 h-3 mr-1" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deposit receipt</DialogTitle>
          <DialogDescription>
            Reference {referenceId} · {deposit.coin_symbol} external deposit
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">Amount credited</p>
          <p className="text-2xl font-bold font-mono">
            {amount.toFixed(8)} {deposit.coin_symbol}
          </p>
          <p className="text-sm text-muted-foreground">
            {usdValue !== null
              ? `${fmtUsd(usdValue)} at ${fmtUsd(usdRate!)} / ${deposit.coin_symbol}`
              : "USD rate unavailable"}
          </p>
          <div className="mt-3">
            <Badge variant="outline" className="uppercase">
              {deposit.confirmation_status} · {deposit.confirmations}/6 confirmations
            </Badge>
          </div>
        </div>

        <div className="space-y-1">
          <Row label="Reference ID" value={referenceId} mono onCopy={() => copy(referenceId, "Reference ID")} />
          <Row label="Account" value={accountName || "-"} />
          <Row label="Email" value={accountEmail || "-"} />
          <Separator className="my-2" />
          <Row
            label="Destination address"
            value={deposit.wallet_address}
            mono
            onCopy={() => copy(deposit.wallet_address, "Address")}
          />
          <Row
            label="Transaction hash"
            value={deposit.transaction_hash || "Not provided"}
            mono
            onCopy={
              deposit.transaction_hash
                ? () => copy(deposit.transaction_hash!, "Transaction hash")
                : undefined
            }
          />
          <Row label="Initiated" value={format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")} />
          <Row
            label="Confirmed"
            value={
              deposit.confirmed_at
                ? format(new Date(deposit.confirmed_at), "MMM dd, yyyy HH:mm")
                : "Pending"
            }
          />
          {deposit.notes && <Row label="Notes" value={deposit.notes} />}
          <Separator className="my-2" />
          <Row label="Deposit record ID" value={deposit.id} mono onCopy={() => copy(deposit.id, "Record ID")} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={download} className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          {deposit.transaction_hash && (
            <Button variant="outline" asChild>
              <a
                href={`https://blockchain.info/tx/${deposit.transaction_hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Explorer
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
