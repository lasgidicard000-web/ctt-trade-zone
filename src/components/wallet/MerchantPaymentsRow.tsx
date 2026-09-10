import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, Store } from "lucide-react";
import { useVirtualCard } from "@/hooks/useVirtualCard";
import { usd } from "@/components/card/merchants";

const statusBadge = (s: string) =>
  s === "approved" ? (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">Paid</Badge>
  ) : s === "declined" ? (
    <Badge variant="outline" className="border-destructive/40 text-destructive">Declined</Badge>
  ) : (
    <Badge variant="outline" className="border-amber-500/40 text-amber-500">Pending review</Badge>
  );

/** Wallet panel listing merchant payments as withdrawals from the card balance. */
export const MerchantPaymentsRow = ({ userId }: { userId?: string | null }) => {
  const { card, merchantRequests } = useVirtualCard(userId);

  const { pendingHeld, paidThisMonth } = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let paid = 0;
    for (const r of merchantRequests) {
      if (r.status === "pending") pending += r.amount_usd;
      if (r.status === "approved") {
        const d = new Date(r.created_at);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
          paid += r.amount_usd;
      }
    }
    return { pendingHeld: pending, paidThisMonth: paid };
  }, [merchantRequests]);

  return (
    <Card className="mb-6 border-border p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-2">
            <Store className="h-4 w-4 text-primary" />
          </span>
          <div>
            <h3 className="font-semibold">Merchant payments</h3>
            <p className="text-xs text-muted-foreground">
              Every approved spend leaves your card balance like a withdrawal
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/merchant-payments">
            View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Paid this month</p>
          <p className="font-semibold tabular-nums">{usd(paidThisMonth)}</p>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Held pending</p>
          <p className="font-semibold tabular-nums">{usd(pendingHeld)}</p>
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[11px] uppercase text-muted-foreground">Card balance</p>
          <p className="font-semibold tabular-nums">{usd(card?.balance_usd ?? 0)}</p>
        </div>
      </div>

      {merchantRequests.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">
          No merchant payments yet.{" "}
          <Link to="/merchant-payments" className="text-primary underline">
            Submit your first spend request
          </Link>
          .
        </p>
      ) : (
        <div className="divide-y divide-border">
          {merchantRequests.slice(0, 6).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <ArrowUpRight className="h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.merchant}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                    {r.reference ? ` · ${r.reference}` : ""}
                    {r.admin_note ? ` · ${r.admin_note}` : ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    r.status === "declined" ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  -{usd(r.amount_usd)}
                </p>
                {statusBadge(r.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
