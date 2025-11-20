import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import PerformanceChart from "@/components/PerformanceChart";
import { CCTPriceChart } from "@/components/CCTPriceChart";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  ShoppingCart,
  Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
}

interface VirtualBalance {
  coin_symbol: string;
  balance: number;
}

interface VirtualTransaction {
  id: string;
  type: string;
  coin_symbol: string;
  amount: number;
  price: number;
  total: number;
  created_at: string;
}

interface PortfolioSnapshot {
  id: string;
  total_value: number;
  balances: Record<string, number>;
  created_at: string;
}

const TradingSimulator = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [coinPrices, setCoinPrices] = useState<CoinPrice[]>([]);
  const [virtualBalances, setVirtualBalances] = useState<VirtualBalance[]>([]);
  const [transactions, setTransactions] = useState<VirtualTransaction[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinPrice | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        initializeData();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Real-time price updates
  useEffect(() => {
    const channel = supabase
      .channel('coin-prices-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coin_prices'
        },
        (payload) => {
          setCoinPrices((current) => 
            current.map((coin) => 
              coin.symbol === payload.new.symbol 
                ? { 
                    symbol: payload.new.symbol,
                    name: payload.new.name,
                    price: parseFloat(payload.new.price),
                    change_24h: parseFloat(payload.new.change_24h || 0)
                  }
                : coin
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const initializeData = async () => {
    await Promise.all([
      fetchCoinPrices(),
      fetchVirtualBalances(),
      fetchTransactions(),
      fetchSnapshots(),
      initializeVirtualWallet()
    ]);
  };

  const initializeVirtualWallet = async () => {
    // Check if user has any virtual balances
    const { data: existingBalances } = await supabase
      .from("virtual_wallet_balances" as any)
      .select("*")
      .limit(1);

    // If no balances exist, initialize with $10,000 USDT
    if (!existingBalances || existingBalances.length === 0) {
      if (!user?.id) return;
      await supabase
        .from("virtual_wallet_balances" as any)
        .insert([{ user_id: user.id, coin_symbol: "USDT", balance: 10000 }]);
      
      toast({
        title: "Welcome to Trading Simulator!",
        description: "You've been credited with $10,000 virtual USDT to start trading.",
      });
      
      fetchVirtualBalances();
    }
  };

  const fetchCoinPrices = async () => {
    const { data, error } = await supabase
      .from("coin_prices")
      .select("symbol, name, price, change_24h")
      .order("symbol");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch coin prices",
        variant: "destructive",
      });
    } else {
      setCoinPrices(data || []);
    }
  };

  const fetchVirtualBalances = async () => {
    const { data, error } = await supabase
      .from("virtual_wallet_balances" as any)
      .select("coin_symbol, balance");

    if (!error) {
      setVirtualBalances((data as any) || []);
    }
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("virtual_transactions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error) {
      setTransactions((data as any) || []);
    }
  };

  const fetchSnapshots = async () => {
    const { data, error } = await supabase
      .from("portfolio_snapshots" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data) {
      const formattedData = (data as any[]).map((snapshot: any) => ({
        id: snapshot.id,
        total_value: parseFloat(snapshot.total_value),
        balances: snapshot.balances as Record<string, number>,
        created_at: snapshot.created_at
      }));
      setSnapshots(formattedData);
    }
  };

  const createSnapshot = async () => {
    if (!user?.id) return;

    const totalValue = getTotalPortfolioValue();
    const balancesObj = virtualBalances.reduce((acc, balance) => {
      acc[balance.coin_symbol] = balance.balance;
      return acc;
    }, {} as Record<string, number>);

    await supabase
      .from("portfolio_snapshots" as any)
      .insert([{
        user_id: user.id,
        total_value: totalValue,
        balances: balancesObj
      }]);

    fetchSnapshots();
  };

  const getBalance = (symbol: string): number => {
    const balance = virtualBalances.find((b) => b.coin_symbol === symbol);
    return balance?.balance || 0;
  };

  const handleBuy = async () => {
    if (!selectedCoin || !tradeAmount || parseFloat(tradeAmount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a coin and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tradeAmount);
    const total = amount * selectedCoin.price;
    const usdtBalance = getBalance("USDT");

    if (total > usdtBalance) {
      toast({
        title: "Insufficient Funds",
        description: `You need $${total.toFixed(2)} USDT but only have $${usdtBalance.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (!user?.id) return;
      
      // Deduct USDT
      const { error: usdtError } = await supabase
        .from("virtual_wallet_balances" as any)
        .upsert([{
          user_id: user.id,
          coin_symbol: "USDT",
          balance: usdtBalance - total
        }], { onConflict: 'user_id,coin_symbol' });

      if (usdtError) throw usdtError;

      // Add purchased coin
      const currentCoinBalance = getBalance(selectedCoin.symbol);
      const { error: coinError } = await supabase
        .from("virtual_wallet_balances" as any)
        .upsert([{
          user_id: user.id,
          coin_symbol: selectedCoin.symbol,
          balance: currentCoinBalance + amount
        }], { onConflict: 'user_id,coin_symbol' });

      if (coinError) throw coinError;

      // Record transaction
      await supabase
        .from("virtual_transactions" as any)
        .insert([{
          user_id: user.id,
          type: "buy",
          coin_symbol: selectedCoin.symbol,
          amount: amount,
          price: selectedCoin.price,
          total: total
        }]);

      toast({
        title: "Purchase Successful",
        description: `Bought ${amount} ${selectedCoin.symbol} for $${total.toFixed(2)}`,
      });

      setTradeAmount("");
      await initializeData();
      await createSnapshot();
    } catch (error) {
      toast({
        title: "Transaction Failed",
        description: "Failed to complete the purchase",
        variant: "destructive",
      });
    }
  };

  const handleSell = async () => {
    if (!selectedCoin || !tradeAmount || parseFloat(tradeAmount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a coin and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tradeAmount);
    const currentBalance = getBalance(selectedCoin.symbol);

    if (amount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have ${currentBalance.toFixed(4)} ${selectedCoin.symbol}`,
        variant: "destructive",
      });
      return;
    }

    const total = amount * selectedCoin.price;

    try {
      if (!user?.id) return;
      
      // Add USDT
      const usdtBalance = getBalance("USDT");
      const { error: usdtError } = await supabase
        .from("virtual_wallet_balances" as any)
        .upsert([{
          user_id: user.id,
          coin_symbol: "USDT",
          balance: usdtBalance + total
        }], { onConflict: 'user_id,coin_symbol' });

      if (usdtError) throw usdtError;

      // Deduct sold coin
      const { error: coinError } = await supabase
        .from("virtual_wallet_balances" as any)
        .upsert([{
          user_id: user.id,
          coin_symbol: selectedCoin.symbol,
          balance: currentBalance - amount
        }], { onConflict: 'user_id,coin_symbol' });

      if (coinError) throw coinError;

      // Record transaction
      await supabase
        .from("virtual_transactions" as any)
        .insert([{
          user_id: user.id,
          type: "sell",
          coin_symbol: selectedCoin.symbol,
          amount: amount,
          price: selectedCoin.price,
          total: total
        }]);

      toast({
        title: "Sale Successful",
        description: `Sold ${amount} ${selectedCoin.symbol} for $${total.toFixed(2)}`,
      });

      setTradeAmount("");
      await initializeData();
      await createSnapshot();
    } catch (error) {
      toast({
        title: "Transaction Failed",
        description: "Failed to complete the sale",
        variant: "destructive",
      });
    }
  };

  const getTotalPortfolioValue = () => {
    return virtualBalances.reduce((total, balance) => {
      if (balance.coin_symbol === "USDT") {
        return total + balance.balance;
      }
      const coin = coinPrices.find((c) => c.symbol === balance.coin_symbol);
      return total + (coin ? balance.balance * coin.price : 0);
    }, 0);
  };

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
            <Button
              onClick={() => navigate("/wallet")}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold">Trading Simulator</h1>
              <p className="text-muted-foreground">Practice trading with virtual funds</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
            </div>
            <p className="text-3xl font-bold">
              ${getTotalPortfolioValue().toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className="h-5 w-5 text-accent" />
              <p className="text-sm text-muted-foreground">Available USDT</p>
            </div>
            <p className="text-3xl font-bold text-accent">
              ${getBalance("USDT").toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
            <p className="text-3xl font-bold">{transactions.length}</p>
          </Card>
        </div>

        <div className="mb-6">
          <PerformanceChart snapshots={snapshots} />
        </div>

        {/* Featured CCT/USDT Trading Pair */}
        {coinPrices.find((c) => c.symbol === "CCT") && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  Caltex Token (CCT/USDT)
                  <span className="text-sm font-normal text-primary">Featured Pair</span>
                </h2>
                <p className="text-sm text-muted-foreground">Trade the native Caltex token</p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <Card className="p-4 bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-bold">
                  ${coinPrices.find((c) => c.symbol === "CCT")?.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </Card>
              
              <Card className="p-4 bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">24h Change</p>
                <div className={`text-2xl font-bold flex items-center gap-1 ${
                  (coinPrices.find((c) => c.symbol === "CCT")?.change_24h || 0) > 0 
                    ? "text-accent" 
                    : "text-destructive"
                }`}>
                  {(coinPrices.find((c) => c.symbol === "CCT")?.change_24h || 0) > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {(coinPrices.find((c) => c.symbol === "CCT")?.change_24h || 0) > 0 ? "+" : ""}
                  {coinPrices.find((c) => c.symbol === "CCT")?.change_24h}%
                </div>
              </Card>
              
              <Card className="p-4 bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
                <p className="text-2xl font-bold">
                  {getBalance("CCT").toFixed(4)} CCT
                </p>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="space-y-2">
                <Label htmlFor="cct-amount">Amount (CCT)</Label>
                <Input
                  id="cct-amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  onChange={(e) => {
                    const cctCoin = coinPrices.find((c) => c.symbol === "CCT");
                    if (cctCoin) {
                      setSelectedCoin(cctCoin);
                      setTradeAmount(e.target.value);
                    }
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => {
                    const cctCoin = coinPrices.find((c) => c.symbol === "CCT");
                    if (cctCoin && tradeAmount) {
                      setSelectedCoin(cctCoin);
                      handleBuy();
                    }
                  }}
                  className="flex-1 bg-accent hover:bg-accent/90"
                  disabled={!tradeAmount}
                >
                  Buy CCT
                </Button>
                <Button
                  onClick={() => {
                    const cctCoin = coinPrices.find((c) => c.symbol === "CCT");
                    if (cctCoin && tradeAmount) {
                      setSelectedCoin(cctCoin);
                      handleSell();
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={!tradeAmount}
                >
                  Sell CCT
                </Button>
              </div>
            </div>

            <CCTPriceChart currentPrice={coinPrices.find((c) => c.symbol === "CCT")?.price || 0} />
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Available Coins</h2>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {coinPrices.map((coin) => (
                    <Card
                      key={coin.symbol}
                      className={`p-4 cursor-pointer transition-all hover:border-primary/50 ${
                        selectedCoin?.symbol === coin.symbol ? "border-primary" : ""
                      }`}
                      onClick={() => setSelectedCoin(coin)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{coin.symbol}</h3>
                          <p className="text-sm text-muted-foreground">{coin.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${coin.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                          <div
                            className={`flex items-center gap-1 text-xs ${
                              coin.change_24h > 0 ? "text-accent" : "text-destructive"
                            }`}
                          >
                            {coin.change_24h > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {coin.change_24h > 0 ? "+" : ""}
                            {coin.change_24h}%
                          </div>
                        </div>
                      </div>
                      {getBalance(coin.symbol) > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            Your balance: {getBalance(coin.symbol).toFixed(4)} {coin.symbol}
                          </p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4">Trade</h2>
              {selectedCoin ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Selected Coin</p>
                    <p className="text-lg font-semibold">{selectedCoin.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${selectedCoin.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={tradeAmount}
                      onChange={(e) => setTradeAmount(e.target.value)}
                      step="0.01"
                      min="0"
                    />
                    {tradeAmount && parseFloat(tradeAmount) > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: ${(parseFloat(tradeAmount) * selectedCoin.price).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <Tabs defaultValue="buy" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="buy">Buy</TabsTrigger>
                      <TabsTrigger value="sell">Sell</TabsTrigger>
                    </TabsList>
                    <TabsContent value="buy" className="space-y-2">
                      <Button onClick={handleBuy} className="w-full" variant="default">
                        Buy {selectedCoin.symbol}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Available: ${getBalance("USDT").toFixed(2)} USDT
                      </p>
                    </TabsContent>
                    <TabsContent value="sell" className="space-y-2">
                      <Button onClick={handleSell} className="w-full" variant="secondary">
                        Sell {selectedCoin.symbol}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Available: {getBalance(selectedCoin.symbol).toFixed(4)} {selectedCoin.symbol}
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Select a coin to start trading
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
              <ScrollArea className="h-[300px]">
                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-sm font-medium ${
                              tx.type === "buy" ? "text-accent" : "text-destructive"
                            }`}
                          >
                            {tx.type.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">
                          {tx.amount.toFixed(4)} {tx.coin_symbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @ ${tx.price.toFixed(2)} = ${tx.total.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No trades yet
                  </p>
                )}
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingSimulator;
