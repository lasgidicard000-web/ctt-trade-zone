import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  investmentId: string;
  planName: string;
  principal: number;
  profit: number;
  onCashedOut?: () => void;
  size?: "sm" | "default";
  className?: string;
}

const fmt = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const PlanCashOutButton = ({
  investmentId,
  planName,
  principal,
  profit,
  onCashedOut,
  size = "sm",
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = principal + profit;

  const confirm = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("withdraw_investment_to_portfolio" as any, {
        _investment_id: investmentId,
      });
      if (error) throw error;
      const res = data as any;
      toast.success(
        `${fmt(Number(res?.totalUsd ?? total))} moved to your total portfolio balance`,
        {
          description: `${planName} terminated · capital ${fmt(
            Number(res?.principal ?? principal)
          )} + profit ${fmt(Number(res?.profit ?? profit))}`,
        }
      );
      setOpen(false);
      onCashedOut?.();
    } catch (e: any) {
      console.error("Plan cash-out failed:", e);
      toast.error(e?.message ?? "Could not withdraw this plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <ArrowDownToLine className="mr-2 h-4 w-4" />
        Withdraw to total portfolio balance
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw {planName} to portfolio balance?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This terminates the plan immediately — before the trading cycle completes — and
                  it stops earning daily ROI.
                </p>
                <div className="rounded-md border border-border divide-y divide-border/60 text-sm">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Locked capital</span>
                    <span className="font-medium tabular-nums">{fmt(principal)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">Accrued profit</span>
                    <span className="font-medium tabular-nums text-emerald-500">
                      + {fmt(profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="font-medium">Credited to portfolio</span>
                    <span className="font-semibold tabular-nums">{fmt(total)}</span>
                  </div>
                </div>
                <p className="text-xs">
                  Funds are credited in BTC at the current market rate and appear in your total
                  portfolio balance and transaction history.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep plan running</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirm();
              }}
              disabled={busy}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Withdraw {fmt(total)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
