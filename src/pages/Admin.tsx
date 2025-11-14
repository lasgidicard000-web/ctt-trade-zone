import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, LogOut, Save } from "lucide-react";
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

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coinPrices, setCoinPrices] = useState<CoinPrice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prices">Coin Prices</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
