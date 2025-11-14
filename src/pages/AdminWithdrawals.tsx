import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { format } from "date-fns";

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

const AdminWithdrawals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await checkAdminStatus(session.user.id);
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

  const checkAdminStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles" as any)
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/wallet");
      return;
    }

    setIsAdmin(true);
    fetchWithdrawals();
  };

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawals" as any)
        .select(`
          *,
          profiles (
            display_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data as any || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast({
        title: "Error",
        description: "Failed to load withdrawals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal || !transactionHash.trim()) {
      toast({
        title: "Error",
        description: "Transaction hash is required",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: {
          action: "approve-withdrawal",
          withdrawalId: selectedWithdrawal.id,
          transactionHash: transactionHash.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Withdrawal approved successfully",
      });

      setApproveDialogOpen(false);
      setTransactionHash("");
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      console.error("Error approving withdrawal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectionNotes.trim()) {
      toast({
        title: "Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-withdrawal", {
        body: {
          action: "reject-withdrawal",
          withdrawalId: selectedWithdrawal.id,
          reason: rejectionNotes.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Withdrawal rejected successfully",
      });

      setRejectDialogOpen(false);
      setRejectionNotes("");
      setSelectedWithdrawal(null);
      fetchWithdrawals();
    } catch (error: any) {
      console.error("Error rejecting withdrawal:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject withdrawal",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openApproveDialog = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (withdrawal: Withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-500",
      completed: "bg-green-500",
      rejected: "bg-red-500",
      cancelled: "bg-gray-500",
    };

    return (
      <Badge className={statusColors[status] || "bg-gray-500"}>
        {status}
      </Badge>
    );
  };

  const filteredWithdrawals = withdrawals.filter(w => 
    statusFilter === "all" ? true : w.status === statusFilter
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-7xl py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Withdrawal Management</h1>
              <p className="text-muted-foreground">Review and process withdrawal requests</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <Card className="mb-6 p-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Status:</Label>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("pending")}
              >
                Pending
              </Button>
              <Button
                variant={statusFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("completed")}
              >
                Completed
              </Button>
              <Button
                variant={statusFilter === "rejected" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("rejected")}
              >
                Rejected
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Net Amount</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWithdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">No withdrawals found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWithdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        {withdrawal.profiles?.display_name || "Unknown User"}
                      </TableCell>
                      <TableCell>${withdrawal.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-red-500">-${withdrawal.fee.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        ${(withdrawal.amount - withdrawal.fee).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {withdrawal.wallet_address.substring(0, 10)}...
                          {withdrawal.wallet_address.substring(withdrawal.wallet_address.length - 8)}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>
                        {format(new Date(withdrawal.created_at), "MMM dd, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openApproveDialog(withdrawal)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openRejectDialog(withdrawal)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : withdrawal.transaction_hash ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`https://etherscan.io/tx/${withdrawal.transaction_hash}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View TX
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {withdrawal.notes || "No action required"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Withdrawal</DialogTitle>
            <DialogDescription>
              Enter the transaction hash to confirm the withdrawal has been processed.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{selectedWithdrawal.profiles?.display_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">${selectedWithdrawal.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fee</p>
                  <p className="font-medium text-red-500">-${selectedWithdrawal.fee.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net Amount</p>
                  <p className="font-medium">${(selectedWithdrawal.amount - selectedWithdrawal.fee).toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <code className="block text-xs bg-muted px-3 py-2 rounded break-all">
                  {selectedWithdrawal.wallet_address}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="txHash">Transaction Hash *</Label>
                <Input
                  id="txHash"
                  placeholder="0x..."
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={processing || !transactionHash.trim()}>
              {processing ? "Processing..." : "Approve Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this withdrawal request. The user's funds will be refunded.
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{selectedWithdrawal.profiles?.display_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">${selectedWithdrawal.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Rejection Reason *</Label>
                <Textarea
                  id="notes"
                  placeholder="Enter the reason for rejection..."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionNotes.trim()}
            >
              {processing ? "Processing..." : "Reject Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWithdrawals;
