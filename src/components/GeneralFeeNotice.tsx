import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useGeneralFee } from "@/hooks/useGeneralFee";

const usd = (n: number) => `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const GeneralFeeNotice = () => {
  const { status, pay } = useGeneralFee();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);

  if (!status || !status.is_general_member || !status.settings.enabled) return null;
  const amt = Number(status.settings.amount_usd);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await pay();
      setReceipt(r);
      toast.success("General plan fee paid");
    } catch (e: any) {
      toast.error(e.message ?? "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <Receipt className="h-5 w-5" /> General plan maintenance fee
          {status.paid_this_cycle ? <Badge variant="secondary">Paid this cycle</Badge>
            : status.due ? <Badge variant="destructive">Due now</Badge> : <Badge variant="outline">Not yet due</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          General plan members pay a maintenance fee of <strong>{usd(amt)}</strong>, once every 2 years, in the first week of October.
          It covers plan administration and account servicing. It is only taken when you confirm payment below.
        </p>
        <div className="grid gap-2 sm:grid-cols-3 text-muted-foreground">
          <div>Current cycle: <span className="text-foreground">{format(new Date(status.cycle_start), "d MMM yyyy")}</span></div>
          <div>Next cycle: <span className="text-foreground">{format(new Date(status.next_cycle_start), "d MMM yyyy")}</span></div>
          <div>Your USDT balance: <span className="text-foreground">{usd(status.usdt_balance)}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {status.due && <Button onClick={() => { setAgree(false); setReceipt(null); setOpen(true); }}>Pay {usd(amt)}</Button>}
          <Button variant="outline" asChild><Link to="/general-fee"><HelpCircle className="mr-2 h-4 w-4" />Fee inquiries</Link></Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{receipt ? "Payment receipt" : "Confirm General plan fee"}</DialogTitle>
            <DialogDescription>
              {receipt ? "Your fee has been paid and added to your transaction history."
                : `${usd(amt)} will be taken from your USDT balance. This fee is charged once every 2 years to every active General plan member.`}
            </DialogDescription>
          </DialogHeader>
          {receipt ? (
            <div className="space-y-1 text-sm">
              <div>Amount: <strong>{usd(receipt.amount_usd)}</strong> ({Number(receipt.usdt_debited).toFixed(2)} USDT)</div>
              <div>Cycle: {format(new Date(receipt.cycle_start), "d MMM yyyy")}</div>
              <div>Paid: {format(new Date(receipt.paid_at), "d MMM yyyy HH:mm")}</div>
              <div className="break-all text-muted-foreground">Reference: {receipt.transaction_id}</div>
            </div>
          ) : (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
              I have read the fee notice and agree to pay {usd(amt)}.
            </label>
          )}
          <DialogFooter>
            {receipt ? <Button onClick={() => setOpen(false)}>Close</Button>
              : <Button disabled={!agree || busy || status.usdt_balance < amt * 0.99} onClick={submit}>
                  {status.usdt_balance < amt * 0.99 ? "Not enough USDT" : busy ? "Paying..." : `Pay ${usd(amt)}`}
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default GeneralFeeNotice;
