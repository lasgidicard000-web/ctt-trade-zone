import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckCircle2, Clock, XCircle, Copy, ExternalLink, Edit } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";

const depositSchema = z.object({
  user_id: z.string().uuid({ message: "Invalid user ID format" }),
  coin_symbol: z.string()
    .trim()
    .min(1, { message: "Coin symbol is required" })
    .max(10, { message: "Coin symbol must be less than 10 characters" })
    .toUpperCase(),
  wallet_address: z.string()
    .trim()
    .min(10, { message: "Wallet address must be at least 10 characters" })
    .max(200, { message: "Wallet address must be less than 200 characters" }),
  amount: z.number()
    .positive({ message: "Amount must be positive" })
    .max(1000000000, { message: "Amount is too large" }),
  transaction_hash: z.string()
    .trim()
    .min(1, { message: "Transaction hash is required" })
    .max(200, { message: "Transaction hash must be less than 200 characters" })
    .optional()
    .or(z.literal("")),
  confirmation_status: z.string().refine(
    (val) => ["pending", "confirmed", "failed"].includes(val),
    { message: "Invalid confirmation status" }
  ),
  confirmations: z.number()
    .int({ message: "Confirmations must be an integer" })
    .min(0, { message: "Confirmations cannot be negative" })
    .max(100, { message: "Confirmations cannot exceed 100" }),
  notes: z.string()
    .max(500, { message: "Notes must be less than 500 characters" })
    .optional()
    .or(z.literal("")),
});

interface DepositRecord {
  id: string;
  user_id: string;
  coin_symbol: string;
  wallet_address: string;
  amount: number;
  transaction_hash: string | null;
  confirmation_status: string;
  confirmations: number;
  created_at: string;
  confirmed_at: string | null;
  notes: string | null;
  profiles?: {
    display_name: string | null;
  } | null;
}

interface User {
  id: string;
  email: string;
  display_name: string | null;
}

const AdminDepositManagement = () => {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRecord | null>(null);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    user_id: "",
    coin_symbol: "",
    wallet_address: "",
    amount: "",
    transaction_hash: "",
    confirmation_status: "pending" as "pending" | "confirmed" | "failed",
    confirmations: "0",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch deposits with user profiles
      const { data: depositsData, error: depositsError } = await supabase
        .from("deposit_history")
        .select("*")
        .order("created_at", { ascending: false });

      if (depositsError) throw depositsError;

      // Fetch profiles separately
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      if (profilesError) throw profilesError;

      // Map profiles to deposits
      const depositsWithProfiles = (depositsData || []).map((deposit) => {
        const profile = profilesData?.find((p) => p.user_id === deposit.user_id);
        return {
          ...deposit,
          profiles: profile ? { display_name: profile.display_name } : null,
        };
      });

      setDeposits(depositsWithProfiles);

      // Fetch users for dropdown
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: userProfilesData, error: userProfilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      if (userProfilesError) throw userProfilesError;

      const usersWithProfiles = authUsers.users.map((user) => {
        const profile = userProfilesData?.find((p) => p.user_id === user.id);
        return {
          id: user.id,
          email: user.email || "",
          display_name: profile?.display_name || null,
        };
      });

      setUsers(usersWithProfiles);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load deposit data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    try {
      const validated = depositSchema.parse({
        user_id: formData.user_id,
        coin_symbol: formData.coin_symbol,
        wallet_address: formData.wallet_address,
        amount: parseFloat(formData.amount),
        transaction_hash: formData.transaction_hash || undefined,
        confirmation_status: formData.confirmation_status,
        confirmations: parseInt(formData.confirmations),
        notes: formData.notes || undefined,
      });
      setErrors({});
      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return null;
    }
  };

  const handleCreateDeposit = async () => {
    const validated = validateForm();
    if (!validated) {
      toast({
        title: "Validation Error",
        description: "Please check all fields and try again",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const insertData: any = {
        user_id: validated.user_id,
        coin_symbol: validated.coin_symbol,
        wallet_address: validated.wallet_address,
        amount: validated.amount,
        transaction_hash: validated.transaction_hash || null,
        confirmation_status: validated.confirmation_status,
        confirmations: validated.confirmations,
        notes: validated.notes || null,
      };

      if (validated.confirmation_status === "confirmed") {
        insertData.confirmed_at = new Date().toISOString();
      }

      const { error } = await supabase.from("deposit_history").insert([insertData]);

      if (error) throw error;

      // If confirmed, update wallet balance
      if (validated.confirmation_status === "confirmed") {
        await updateWalletBalance(validated.user_id, validated.coin_symbol, validated.amount);
      }

      toast({
        title: "Success",
        description: "Deposit record created successfully",
      });

      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create deposit record",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateDeposit = async () => {
    if (!selectedDeposit) return;

    const validated = validateForm();
    if (!validated) {
      toast({
        title: "Validation Error",
        description: "Please check all fields and try again",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const updateData: any = {
        coin_symbol: validated.coin_symbol,
        wallet_address: validated.wallet_address,
        amount: validated.amount,
        transaction_hash: validated.transaction_hash || null,
        confirmation_status: validated.confirmation_status,
        confirmations: validated.confirmations,
        notes: validated.notes || null,
      };

      if (
        validated.confirmation_status === "confirmed" &&
        selectedDeposit.confirmation_status !== "confirmed"
      ) {
        updateData.confirmed_at = new Date().toISOString();
        // Update wallet balance when changing to confirmed
        await updateWalletBalance(
          selectedDeposit.user_id,
          validated.coin_symbol,
          validated.amount
        );
      }

      const { error } = await supabase
        .from("deposit_history")
        .update(updateData)
        .eq("id", selectedDeposit.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deposit record updated successfully",
      });

      setEditDialogOpen(false);
      setSelectedDeposit(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update deposit record",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const updateWalletBalance = async (userId: string, coinSymbol: string, amount: number) => {
    const { data: existingBalance, error: fetchError } = await supabase
      .from("wallet_balances")
      .select("balance")
      .eq("user_id", userId)
      .eq("coin_symbol", coinSymbol)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingBalance) {
      const { error: updateError } = await supabase
        .from("wallet_balances")
        .update({ balance: existingBalance.balance + amount })
        .eq("user_id", userId)
        .eq("coin_symbol", coinSymbol);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("wallet_balances").insert([
        {
          user_id: userId,
          coin_symbol: coinSymbol,
          balance: amount,
        },
      ]);

      if (insertError) throw insertError;
    }

    // Create transaction record
    await supabase.from("transactions").insert([
      {
        user_id: userId,
        type: "deposit",
        to_symbol: coinSymbol,
        amount: amount,
        status: "completed",
      },
    ]);
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      coin_symbol: "",
      wallet_address: "",
      amount: "",
      transaction_hash: "",
      confirmation_status: "pending",
      confirmations: "0",
      notes: "",
    });
    setErrors({});
  };

  const openEditDialog = (deposit: DepositRecord) => {
    setSelectedDeposit(deposit);
    setFormData({
      user_id: deposit.user_id,
      coin_symbol: deposit.coin_symbol,
      wallet_address: deposit.wallet_address,
      amount: deposit.amount.toString(),
      transaction_hash: deposit.transaction_hash || "",
      confirmation_status: deposit.confirmation_status as "pending" | "confirmed" | "failed",
      confirmations: deposit.confirmations.toString(),
      notes: deposit.notes || "",
    });
    setEditDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
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

  const filteredDeposits = deposits.filter((deposit) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      deposit.coin_symbol.toLowerCase().includes(searchLower) ||
      deposit.wallet_address.toLowerCase().includes(searchLower) ||
      deposit.transaction_hash?.toLowerCase().includes(searchLower) ||
      deposit.profiles?.display_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading deposits...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Deposit Management</CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Deposit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Search by coin, wallet address, transaction hash, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Coin</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Wallet Address</TableHead>
                <TableHead>Transaction Hash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No deposits found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="text-sm">
                      {format(new Date(deposit.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {deposit.profiles?.display_name || "N/A"}
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
                      <span className="text-sm">{deposit.confirmations}/6</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(deposit)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create Deposit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Deposit Record</DialogTitle>
            <DialogDescription>
              Manually create a deposit record for a user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user">User *</Label>
              <Select
                value={formData.user_id}
                onValueChange={(value) => setFormData({ ...formData, user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.display_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.user_id && <p className="text-sm text-red-500 mt-1">{errors.user_id}</p>}
            </div>

            <div>
              <Label htmlFor="coin_symbol">Coin Symbol *</Label>
              <Input
                id="coin_symbol"
                value={formData.coin_symbol}
                onChange={(e) =>
                  setFormData({ ...formData, coin_symbol: e.target.value.toUpperCase() })
                }
                placeholder="BTC, ETH, USDT, etc."
                maxLength={10}
              />
              {errors.coin_symbol && (
                <p className="text-sm text-red-500 mt-1">{errors.coin_symbol}</p>
              )}
            </div>

            <div>
              <Label htmlFor="wallet_address">Wallet Address *</Label>
              <Input
                id="wallet_address"
                value={formData.wallet_address}
                onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                placeholder="Enter wallet address"
                maxLength={200}
              />
              {errors.wallet_address && (
                <p className="text-sm text-red-500 mt-1">{errors.wallet_address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <Label htmlFor="transaction_hash">Transaction Hash</Label>
              <Input
                id="transaction_hash"
                value={formData.transaction_hash}
                onChange={(e) => setFormData({ ...formData, transaction_hash: e.target.value })}
                placeholder="Enter transaction hash (optional)"
                maxLength={200}
              />
              {errors.transaction_hash && (
                <p className="text-sm text-red-500 mt-1">{errors.transaction_hash}</p>
              )}
            </div>

            <div>
              <Label htmlFor="status">Confirmation Status *</Label>
              <Select
                value={formData.confirmation_status}
                onValueChange={(value: "pending" | "confirmed" | "failed") =>
                  setFormData({ ...formData, confirmation_status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              {errors.confirmation_status && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmation_status}</p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmations">Confirmations *</Label>
              <Input
                id="confirmations"
                type="number"
                min="0"
                max="100"
                value={formData.confirmations}
                onChange={(e) => setFormData({ ...formData, confirmations: e.target.value })}
                placeholder="0"
              />
              {errors.confirmations && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmations}</p>
              )}
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes (optional)"
                maxLength={500}
                rows={3}
              />
              {errors.notes && <p className="text-sm text-red-500 mt-1">{errors.notes}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateDeposit} disabled={processing}>
                {processing ? "Creating..." : "Create Deposit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Deposit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Deposit Record</DialogTitle>
            <DialogDescription>
              Update deposit status and details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_coin_symbol">Coin Symbol *</Label>
              <Input
                id="edit_coin_symbol"
                value={formData.coin_symbol}
                onChange={(e) =>
                  setFormData({ ...formData, coin_symbol: e.target.value.toUpperCase() })
                }
                placeholder="BTC, ETH, USDT, etc."
                maxLength={10}
              />
              {errors.coin_symbol && (
                <p className="text-sm text-red-500 mt-1">{errors.coin_symbol}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_wallet_address">Wallet Address *</Label>
              <Input
                id="edit_wallet_address"
                value={formData.wallet_address}
                onChange={(e) => setFormData({ ...formData, wallet_address: e.target.value })}
                placeholder="Enter wallet address"
                maxLength={200}
              />
              {errors.wallet_address && (
                <p className="text-sm text-red-500 mt-1">{errors.wallet_address}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_amount">Amount *</Label>
              <Input
                id="edit_amount"
                type="number"
                step="0.00000001"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>

            <div>
              <Label htmlFor="edit_transaction_hash">Transaction Hash</Label>
              <Input
                id="edit_transaction_hash"
                value={formData.transaction_hash}
                onChange={(e) => setFormData({ ...formData, transaction_hash: e.target.value })}
                placeholder="Enter transaction hash (optional)"
                maxLength={200}
              />
              {errors.transaction_hash && (
                <p className="text-sm text-red-500 mt-1">{errors.transaction_hash}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_status">Confirmation Status *</Label>
              <Select
                value={formData.confirmation_status}
                onValueChange={(value: "pending" | "confirmed" | "failed") =>
                  setFormData({ ...formData, confirmation_status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              {errors.confirmation_status && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmation_status}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_confirmations">Confirmations *</Label>
              <Input
                id="edit_confirmations"
                type="number"
                min="0"
                max="100"
                value={formData.confirmations}
                onChange={(e) => setFormData({ ...formData, confirmations: e.target.value })}
                placeholder="0"
              />
              {errors.confirmations && (
                <p className="text-sm text-red-500 mt-1">{errors.confirmations}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit_notes">Notes</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes (optional)"
                maxLength={500}
                rows={3}
              />
              {errors.notes && <p className="text-sm text-red-500 mt-1">{errors.notes}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedDeposit(null);
                  resetForm();
                }}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateDeposit} disabled={processing}>
                {processing ? "Updating..." : "Update Deposit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminDepositManagement;