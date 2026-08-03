import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ExternalLink, Copy, CheckCircle2, Clock, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { generateDepositReceipt } from "@/lib/depositReceipt";

interface DepositRecord {
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


export const DepositHistory = () => {
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState({ name: "", email: "" });
  const { prices } = useRealtimePrices();

  useEffect(() => {
    fetchDepositHistory();
  }, []);

  const fetchDepositHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      setAccount({
        name: profile?.display_name || user.email || "",
        email: user.email || "",
      });


      const { data, error } = await supabase
        .from("deposit_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching deposit history:", error);
      toast.error("Failed to load deposit history");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading deposit history...</p>
      </Card>
    );
  }

  if (deposits.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No deposits yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Deposit History</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Wallet Address</TableHead>
              <TableHead>Transaction Hash</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confirmations</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deposits.map((deposit) => (
              <TableRow key={deposit.id}>
                <TableCell className="text-sm">
                  {format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">{deposit.coin_symbol}</TableCell>
                <TableCell className="font-mono">
                  {Number(deposit.amount).toFixed(8)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">
                      {truncateHash(deposit.wallet_address)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(deposit.wallet_address)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  {deposit.transaction_hash ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono">
                        {truncateHash(deposit.transaction_hash)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(deposit.transaction_hash!)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <a
                        href={`https://blockchain.info/tx/${deposit.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(deposit.confirmation_status)}</TableCell>
                <TableCell>
                  <span className="text-sm">
                    {deposit.confirmations}/6
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};