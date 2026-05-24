import AdminUserManagement from "@/components/AdminUserManagement";
import AdminDepositManagement from "@/components/AdminDepositManagement";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogOut, Save, CheckCircle, XCircle } from "lucide-react";
import type { User, Session } from "@supabase/supabase-js";

interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  from_symbol: string | null;
  to_symbol: string | null;
  amount: number;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  wallet_address: string;
  fee: number;
  status: string;
  transaction_hash: string | null;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
  profiles?: {
    display_name: string | null;
  };
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coinPrices, setCoinPrices] = useState<CoinPrice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        } else {
          checkAdminStatus(session.user.id);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        checkAdminStatus(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error) {
      console.error("Error checking admin status:", error);
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/wallet");
      return;
    }

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/wallet");
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    // Fetch coin prices
    const { data: prices, error: pricesError } = await supabase
      .from("coin_prices")
      .select("*")
      .order("symbol");

    if (pricesError) {
      toast({
        title: "Error",
        description: "Failed to fetch coin prices",
        variant: "destructive",
      });
    } else {
      setCoinPrices(prices || []);
      const initialPrices: Record<string, number> = {};
      prices?.forEach((coin) => {
        initialPrices[coin.id] = coin.price;
      });
      setEditingPrices(initialPrices);
    }

    // Fetch all transactions
    const { data: txns, error: txnsError } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (txnsError) {
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } else {
      setTransactions(txns || []);
    }

    // Fetch all withdrawals
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from("withdrawals" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (withdrawalError) {
      toast({
        title: "Error",
        description: "Failed to fetch withdrawals",
        variant: "destructive",
      });
    } else {
      setWithdrawals((withdrawalData as any) || []);
    }
  };

  const handlePriceUpdate = async (coinId: string) => {
    const newPrice = editingPrices[coinId];
    
    if (!newPrice || newPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Price must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("coin_prices")
      .update({ price: newPrice })
      .eq("id", coinId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update price",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Price updated successfully",
      });
      fetchData();
    }
  };

  const handleApproveWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    if (!transactionHash.trim()) {
      toast({
        title: "Transaction hash required",
        description: "Please enter a blockchain transaction hash",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          action: 'approve-withdrawal',
          withdrawalId: selectedWithdrawal.id,
          transactionHash: transactionHash.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Withdrawal approved",
        description: "Withdrawal has been processed successfully",
      });

      setApproveDialogOpen(false);
      setTransactionHash('');
      setSelectedWithdrawal(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectWithdrawal = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('process-withdrawal', {
        body: {
          action: 'reject-withdrawal',
          withdrawalId: selectedWithdrawal.id,
          reason: rejectionReason.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Withdrawal rejected",
        description: "Withdrawal has been rejected and funds refunded",
      });

      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedWithdrawal(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-12">
        <div className="mb-8 flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <h1 className="mb-2 text-4xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage coin prices and view transactions</p>
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="prices" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="prices">Coin Prices</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="prices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Coin Prices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coinPrices.map((coin) => (
                    <div key={coin.id} className="flex items-end gap-4 p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <Label htmlFor={`price-${coin.id}`}>
                          {coin.symbol} - {coin.name}
                        </Label>
                        <div className="mt-2 flex gap-2">
                          <Input
                            id={`price-${coin.id}`}
                            type="number"
                            step="0.01"
                            value={editingPrices[coin.id] || ""}
                            onChange={(e) =>
                              setEditingPrices({
                                ...editingPrices,
                                [coin.id]: parseFloat(e.target.value),
                              })
                            }
                            placeholder="Enter price"
                          />
                          <Button onClick={() => handlePriceUpdate(coin.id)}>
                            <Save className="mr-2 h-4 w-4" />
                            Update
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-lg font-semibold">
                          ${coin.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          24h: {coin.change_24h > 0 ? "+" : ""}
                          {coin.change_24h}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>
                            {new Date(txn.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {txn.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="capitalize">{txn.type}</TableCell>
                          <TableCell>{txn.from_symbol || "-"}</TableCell>
                          <TableCell>{txn.to_symbol || "-"}</TableCell>
                          <TableCell>{txn.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                txn.status === "completed"
                                  ? "bg-accent/10 text-accent"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {txn.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Withdrawal Requests</span>
                  <Button onClick={() => navigate("/admin/withdrawals")}>
                    View Full Management Page
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Wallet Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No withdrawal requests found
                        </TableCell>
                      </TableRow>
                    ) : (
                      withdrawals.map((withdrawal) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="text-sm">
                            {new Date(withdrawal.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {withdrawal.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${parseFloat(withdrawal.amount.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            ${parseFloat(withdrawal.fee.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">
                            {withdrawal.wallet_address}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(withdrawal.status)}
                          </TableCell>
                          <TableCell>
                            {withdrawal.status === 'pending' ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedWithdrawal(withdrawal);
                                    setApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedWithdrawal(withdrawal);
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </div>
                            ) : withdrawal.transaction_hash ? (
                              <span className="text-xs font-mono text-muted-foreground">
                                {withdrawal.transaction_hash.slice(0, 10)}...
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {withdrawal.notes || '-'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposits">
            <AdminDepositManagement />
          </TabsContent>

          <TabsContent value="redemptions">
            <Card>
              <CardHeader>
                <CardTitle>Gift Card Redemption Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Review all submitted gift card redemption documents, approve, reject, or mark as paid.
                </p>
                <Button onClick={() => navigate("/admin/redemptions")}>
                  Open Redemption Manager
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUserManagement />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Approve Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Withdrawal</DialogTitle>
              <DialogDescription>
                Enter the blockchain transaction hash to approve this withdrawal
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">${parseFloat(selectedWithdrawal.amount.toString()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee:</span>
                    <span>${parseFloat(selectedWithdrawal.fee.toString()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet Address:</span>
                    <span className="font-mono text-xs">{selectedWithdrawal.wallet_address.slice(0, 20)}...</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="txHash">Transaction Hash</Label>
                  <Input
                    id="txHash"
                    placeholder="0x..."
                    value={transactionHash}
                    onChange={(e) => setTransactionHash(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the blockchain transaction hash confirming the transfer
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApproveWithdrawal}
                    disabled={processing || !transactionHash.trim()}
                    className="flex-1"
                  >
                    {processing ? "Processing..." : "Approve Withdrawal"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setApproveDialogOpen(false);
                      setTransactionHash('');
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Withdrawal</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this withdrawal. Funds will be refunded to the user.
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-semibold">${parseFloat(selectedWithdrawal.amount.toString()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet Address:</span>
                    <span className="font-mono text-xs">{selectedWithdrawal.wallet_address.slice(0, 20)}...</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Rejection Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleRejectWithdrawal}
                    disabled={processing || !rejectionReason.trim()}
                    className="flex-1"
                  >
                    {processing ? "Processing..." : "Reject & Refund"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectDialogOpen(false);
                      setRejectionReason('');
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Admin;
