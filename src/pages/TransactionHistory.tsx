import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Filter, TrendingUp, TrendingDown, ArrowUpDown, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface CombinedTransaction {
  id: string;
  date: Date;
  type: string;
  amount: number;
  currency: string;
  status: string;
  details: string;
  notes: string | null;
  source: string;
}

const TransactionHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<CombinedTransaction[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchTransactions(session.user.id);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchTransactions = async (userId: string) => {
    try {
      const combined: CombinedTransaction[] = [];

      // Fetch regular transactions
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (transactionsData) {
        transactionsData.forEach((tx: any) => {
          combined.push({
            id: tx.id,
            date: new Date(tx.created_at),
            type: tx.type,
            amount: parseFloat(tx.amount),
            currency: tx.to_symbol || tx.from_symbol || "BTC",
            status: tx.status,
            details: `${tx.from_symbol || ""} → ${tx.to_symbol || ""}`,
            notes: tx.notes || null,
            source: "transaction",
          });
        });
      }

      // Sort by date descending
      combined.sort((a, b) => b.date.getTime() - a.date.getTime());
      setAllTransactions(combined);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to load transaction history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    return allTransactions.filter(tx => {
      if (startDate && tx.date < new Date(startDate)) return false;
      if (endDate && tx.date > new Date(endDate + "T23:59:59")) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (minAmount && tx.amount < parseFloat(minAmount)) return false;
      if (maxAmount && tx.amount > parseFloat(maxAmount)) return false;
      return true;
    });
  };

  const exportToCSV = () => {
    const data = getFilteredTransactions();
    
    const headers = ["Date", "Type", "Amount", "Currency", "Status", "Details"];
    const csvContent = [
      headers.join(","),
      ...data.map(tx => [
        format(tx.date, "yyyy-MM-dd HH:mm:ss"),
        tx.type,
        tx.amount.toFixed(2),
        tx.currency,
        tx.status,
        `"${tx.details}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Transaction history has been exported to CSV",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: "bg-green-500",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-500"}>
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    if (type === "deposit") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (type === "withdrawal") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <ArrowUpDown className="h-4 w-4 text-blue-500" />;
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setTypeFilter("all");
    setStatusFilter("all");
    setMinAmount("");
    setMaxAmount("");
  };

  const filteredData = getFilteredTransactions();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/wallet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Transaction History</h1>
              <p className="text-muted-foreground">View and export your complete transaction history</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="mb-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>Clear All</Button>
              <Button size="sm" onClick={exportToCSV} disabled={filteredData.length === 0}>
                <Download className="mr-2 h-4 w-4" />Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Min Amount</Label>
              <Input type="number" placeholder="0.00" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} step="0.01" />
            </div>
            <div className="space-y-2">
              <Label>Max Amount</Label>
              <Input type="number" placeholder="Unlimited" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} step="0.01" />
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredData.length} of {allTransactions.length} transaction(s)
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                        <p className="text-muted-foreground">
                          {allTransactions.length === 0 ? "No transactions yet" : "No transactions found matching your filters"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((tx) => (
                    <TableRow key={`${tx.source}-${tx.id}`}>
                      <TableCell className="font-medium">{format(tx.date, "MMM dd, yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(tx.type)}
                          <span className="capitalize">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">${tx.amount.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline">{tx.currency}</Badge></TableCell>
                      <TableCell>{getStatusBadge(tx.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.notes ? (
                          <div>
                            <span className="font-medium text-accent">{tx.notes}</span>
                            <span className="block text-xs">{tx.details}</span>
                          </div>
                        ) : tx.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TransactionHistory;
