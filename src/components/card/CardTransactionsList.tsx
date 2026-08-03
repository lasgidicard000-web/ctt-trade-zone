import { Badge } from "@/components/ui/badge";
import type { CardTransaction } from "@/hooks/useVirtualCard";

export const CardTransactionsList = ({ transactions }: { transactions: CardTransaction[] }) => {
  if (transactions.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No card activity yet. Your purchases will appear here.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{t.merchant}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(t.created_at).toLocaleString()}
              {t.status === "declined" && t.decline_reason ? ` · ${t.decline_reason}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-semibold tabular-nums ${
                t.status === "declined" ? "text-muted-foreground line-through" : ""
              }`}
            >
              -$
              {t.amount_usd.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <Badge
              variant="outline"
              className={
                t.status === "approved"
                  ? "border-emerald-500/40 text-emerald-500"
                  : "border-destructive/40 text-destructive"
              }
            >
              {t.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
};
