import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Landmark,
  LineChart,
  Megaphone,
  Pencil,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  BANK_WITHDRAWAL_MINIMUM,
  type CardBankAccount,
  type CardBankWithdrawal,
  type VirtualCard,
} from "@/hooks/useVirtualCard";
import { BankAccountForm } from "@/components/card/BankAccountForm";
import { ConvertBtcToCardDialog } from "@/components/card/ConvertBtcToCardDialog";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const statusBadge = (status: string) => {
  if (status === "pending")
    return (
      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600">
        Pending review
      </Badge>
    );
  if (status === "paid")
    return (
      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600">
        Paid
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600">
      Declined
    </Badge>
  );
};

interface Props {
  userId: string;
  card: VirtualCard;
  bankAccount: CardBankAccount | null;
  bankWithdrawals: CardBankWithdrawal[];
  pendingHeld: number;
  onSaveBank: (values: {
    holderName: string;
    bankName: string;
    accountNumber: string;
    branchCode?: string;
    country?: string;
  }) => Promise<{ error?: string }>;
  onWithdraw: (amountUsd: number) => Promise<{ error?: string; result?: any }>;
  onConvert: (amountUsd: number, investmentId?: string) => Promise<{ error?: string; result?: any }>;
}

export const BankWithdrawalDialog = ({
  userId,
  card,
  bankAccount,
  bankWithdrawals,
  pendingHeld,
  onSaveBank,
  onWithdraw,
  onConvert,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(BANK_WITHDRAWAL_MINIMUM));
  const [busy, setBusy] = useState(false);

  const available = useMemo(
    () => Math.max(0, (card.balance_usd ?? 0) - pendingHeld),
    [card.balance_usd, pendingHeld]
  );
  const belowMinimum = available < BANK_WITHDRAWAL_MINIMUM;

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setBusy(true);
    const res = await onWithdraw(value);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Simulated bank transfer submitted for review");
    setOpen(false);
  };

  return (
    <Card className="mt-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
            <Landmark className="h-4 w-4 text-primary" /> Bank transfer (simulated)
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Available to transfer {usd(available)} · minimum {usd(BANK_WITHDRAWAL_MINIMUM)}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] uppercase">
          Demo feature
        </Badge>
      </div>

      {bankAccount && (
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{bankAccount.holder_name}</p>
              <p className="text-muted-foreground">
                {bankAccount.bank_name} · {bankAccount.account_masked}
                {bankAccount.branch_code ? ` · ${bankAccount.branch_code}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(true);
                setOpen(true);
              }}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </div>
      )}

      <Button
        className="mt-3 w-full font-bold uppercase tracking-wide"
        onClick={() => {
          setEditing(!bankAccount);
          setOpen(true);
        }}
      >
        Withdraw from card to bank account
      </Button>

      {bankWithdrawals.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {bankWithdrawals.slice(0, 4).map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs"
            >
              <div>
                <p className="font-semibold tabular-nums">-{usd(w.amount_usd)}</p>
                <p className="text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
              </div>
              {statusBadge(w.status)}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Withdraw from card to bank account</DialogTitle>
            <DialogDescription>
              A simulated transfer for demonstration. No real money or cryptocurrency moves.
            </DialogDescription>
          </DialogHeader>

          {editing || !bankAccount ? (
            <BankAccountForm
              bankAccount={bankAccount}
              onSave={onSaveBank}
              onDone={() => setEditing(false)}
            />
          ) : belowMinimum ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-700 dark:text-amber-400">
                Your demo balance is below the minimum withdrawal amount. You can continue by using
                the simulated options below.
              </p>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Convert plan profits to USDT spend card
                </p>
                <ConvertBtcToCardDialog userId={userId} card={card} onConvert={onConvert} />

                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/investment-plans">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Wait for plan cycle to complete
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/demo-trading">
                    <span className="flex items-center gap-2">
                      <LineChart className="h-4 w-4" /> Explore demo trading
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[11px] font-bold uppercase tracking-wide text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Trading involves risk. There is no guarantee of profit or success. This feature is a
                simulation for demonstration purposes only.
              </p>
              <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-[11px] font-bold uppercase tracking-wide text-primary">
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Important: contact your sponsor or demo support to learn how the simulated trading
                feature works.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                <p className="font-semibold">{bankAccount.holder_name}</p>
                <p className="text-muted-foreground">
                  {bankAccount.bank_name} · {bankAccount.account_masked}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Amount (USD)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                />
                <p className="text-[11px] text-muted-foreground">
                  Minimum {usd(BANK_WITHDRAWAL_MINIMUM)} · available {usd(available)}
                </p>
              </div>

              <Button className="w-full" disabled={busy} onClick={submit}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                {busy ? "Submitting…" : "Submit simulated transfer"}
              </Button>

              <p className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-[11px] font-bold uppercase tracking-wide text-primary">
                <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Important: contact your sponsor or demo support to learn how the simulated trading
                feature works.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BankWithdrawalDialog;
