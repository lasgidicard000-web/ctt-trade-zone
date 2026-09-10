import { Badge } from "@/components/ui/badge";
import type { CardFundingRequest } from "@/hooks/useVirtualCard";

const usd = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tone = (status: string) =>
  status === "credited"
    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
    : status === "rejected"
    ? "border-destructive/40 text-destructive"
    : "border-amber-500/40 text-amber-600 dark:text-amber-400";

const label = (status: string) =>
  status === "credited" ? "Credited" : status === "rejected" ? "Rejected" : "Pending";

export const CardFundingHistory = ({ requests }: { requests: CardFundingRequest[] }) => {
  if (requests.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        No card deposits yet. Send USDT on the Tron (TRC20) network to your card address, then submit
        the amount above.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular-nums">
              ${usd(r.amount_usd)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {r.coin_symbol} · {r.network}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {new Date(r.created_at).toLocaleString()}
              {r.tx_hash ? ` · ${r.tx_hash.slice(0, 12)}…` : ""}
            </p>
            {r.admin_note && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">Note: {r.admin_note}</p>
            )}
          </div>
          <Badge variant="outline" className={tone(r.status)}>
            {label(r.status)}
          </Badge>
        </li>
      ))}
    </ul>
  );
};

export default CardFundingHistory;
