import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, LogOut, Shield, MessageCircle, Gamepad2, ShoppingCart, Coins, Plus, Trophy, Radio } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";
import PriceAlerts from "@/components/PriceAlerts";
import AlertNotifications from "@/components/AlertNotifications";
import { RewardsSection } from "@/components/RewardsSection";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
}

interface WalletBalance {
  coin_symbol: string;
  balance: number;
}

const Wallet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { prices: coinPrices, priceChanges, loading: pricesLoading } = useRealtimePrices();
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const paypalButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchData();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchData = async () => {
    // Check if user is admin
    if (user?.id) {
      const { data: roleData } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!roleData);
    }

    // Fetch user wallet balances
    const { data: balances, error: balancesError } = await supabase
      .from("wallet_balances")
      .select("coin_symbol, balance");

    if (balancesError) {
      toast({
        title: "Error",
        description: "Failed to fetch wallet balances",
        variant: "destructive",
      });
    } else {
      setWalletBalances(balances || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
    navigate("/auth");
  };

  const getCoinData = () => {
    return coinPrices.map((coin) => {
      const walletBalance = walletBalances.find((b) => b.coin_symbol === coin.symbol);
      return {
        ...coin,
        balance: walletBalance?.balance || 0,
      };
    });
  };

  const totalPortfolioValue = getCoinData().reduce(
    (acc, coin) => acc + coin.price * coin.balance,
    0
  );

  const openTradeDialog = (type: 'buy' | 'sell', coinSymbol: string) => {
    setTradeType(type);
    setSelectedCoin(coinSymbol);
    setTradeAmount('');
    setTradeDialogOpen(true);
  };

  const handleTrade = async () => {
    if (!user || !selectedCoin || !tradeAmount || parseFloat(tradeAmount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(tradeAmount);
    const coin = getCoinData().find(c => c.symbol === selectedCoin);
    
    if (!coin) return;

    const total = amount * coin.price;

    try {
      if (tradeType === 'buy') {
        // Check USDT balance
        const usdtBalance = walletBalances.find(b => b.coin_symbol === 'USDT')?.balance || 0;
        
        if (total > usdtBalance) {
          toast({
            title: "Insufficient funds",
            description: "Not enough USDT to complete this purchase",
            variant: "destructive",
          });
          return;
        }

        // Update USDT balance (decrease)
        await supabase
          .from("wallet_balances")
          .upsert({
            user_id: user.id,
            coin_symbol: 'USDT',
            balance: usdtBalance - total,
          }, { onConflict: 'user_id,coin_symbol' });

        // Update coin balance (increase)
        const currentBalance = coin.balance;
        await supabase
          .from("wallet_balances")
          .upsert({
            user_id: user.id,
            coin_symbol: selectedCoin,
            balance: currentBalance + amount,
          }, { onConflict: 'user_id,coin_symbol' });

      } else {
        // Sell
        if (amount > coin.balance) {
          toast({
            title: "Insufficient balance",
            description: `Not enough ${selectedCoin} to sell`,
            variant: "destructive",
          });
          return;
        }

        // Update coin balance (decrease)
        await supabase
          .from("wallet_balances")
          .upsert({
            user_id: user.id,
            coin_symbol: selectedCoin,
            balance: coin.balance - amount,
          }, { onConflict: 'user_id,coin_symbol' });

        // Update USDT balance (increase)
        const usdtBalance = walletBalances.find(b => b.coin_symbol === 'USDT')?.balance || 0;
        await supabase
          .from("wallet_balances")
          .upsert({
            user_id: user.id,
            coin_symbol: 'USDT',
            balance: usdtBalance + total,
          }, { onConflict: 'user_id,coin_symbol' });
      }

      // Record transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: tradeType,
          from_symbol: tradeType === 'buy' ? 'USDT' : selectedCoin,
          to_symbol: tradeType === 'buy' ? selectedCoin : 'USDT',
          amount: tradeType === 'buy' ? amount : total,
        });

      toast({
        title: "Trade successful",
        description: `${tradeType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${selectedCoin}`,
      });

      setTradeDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Trade failed",
        description: "An error occurred during the trade",
        variant: "destructive",
      });
    }
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      // Create PayPal order
      const { data: createData, error: createError } = await supabase.functions.invoke(
        'paypal-deposit',
        {
          body: { action: 'create-order', amount },
        }
      );

      if (createError) throw createError;

      const orderId = createData.orderId;

      // Open PayPal payment window
      const paypalWindow = window.open(
        `https://www.paypal.com/checkoutnow?token=${orderId}`,
        'PayPal',
        'width=500,height=600'
      );

      // Poll for payment completion
      const checkPayment = setInterval(async () => {
        if (paypalWindow?.closed) {
          clearInterval(checkPayment);
          
          // Capture the order
          const { data: captureData, error: captureError } = await supabase.functions.invoke(
            'paypal-deposit',
            {
              body: { action: 'capture-order', orderId },
            }
          );

          setIsProcessingPayment(false);

          if (captureError) {
            toast({
              title: "Payment failed",
              description: "Could not process your payment",
              variant: "destructive",
            });
          } else if (captureData.success) {
            toast({
              title: "Funds added!",
              description: `Successfully added $${captureData.amount} USDT to your wallet`,
            });
            setAddFundsDialogOpen(false);
            setDepositAmount('');
            fetchData();
          }
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkPayment);
        setIsProcessingPayment(false);
      }, 300000);
    } catch (error) {
      setIsProcessingPayment(false);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
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
      {user && <AlertNotifications user={user} />}
      <div className="container mx-auto max-w-6xl py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <WalletIcon className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Wallet Dashboard</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            View all available cryptocurrencies and your portfolio
            <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs text-accent">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          </p>
          <div className="mt-4 flex gap-2 justify-center flex-wrap">
            <ThemeToggle />
            <Button onClick={() => navigate("/simulator")} variant="default" size="sm">
              <Gamepad2 className="mr-2 h-4 w-4" />
              Trading Simulator
            </Button>
            <Button onClick={() => navigate("/leaderboard")} variant="default" size="sm">
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            <Button onClick={() => navigate("/chat")} variant="default" size="sm">
              <MessageCircle className="mr-2 h-4 w-4" />
              AI Advisor
            </Button>
            {isAdmin && (
              <Button onClick={() => navigate("/admin")} variant="default" size="sm">
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            )}
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <Card className="mb-6 border-border bg-gradient-to-br from-primary/10 to-accent/10 p-6">
          <div className="text-center">
            <p className="mb-2 text-sm text-muted-foreground">Total Portfolio Value</p>
            <p className="text-4xl font-bold text-foreground">
              ${totalPortfolioValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <Button 
              onClick={() => setAddFundsDialogOpen(true)} 
              variant="default" 
              size="sm"
              className="mt-4"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Funds
            </Button>
          </div>
        </Card>

        {user && <div className="mb-6"><PriceAlerts user={user} coins={coinPrices} /></div>}

        {user && <div className="mb-6"><RewardsSection user={user} onRewardClaimed={fetchData} /></div>}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getCoinData().map((coin) => {
            const priceChange = priceChanges.get(coin.symbol);
            const isUpdating = priceChange && Date.now() - priceChange.timestamp < 2000;
            
            return (
              <Card
                key={coin.symbol}
                className={`border-border bg-card p-6 transition-all hover:border-primary/50 ${
                  isUpdating 
                    ? priceChange.direction === 'up' 
                      ? 'ring-2 ring-accent/50 animate-pulse' 
                      : 'ring-2 ring-destructive/50 animate-pulse'
                    : ''
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{coin.symbol}</h3>
                    <p className="text-sm text-muted-foreground">{coin.name}</p>
                  </div>
                  <div
                    className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                      coin.change_24h > 0
                        ? "bg-accent/10 text-accent"
                        : coin.change_24h < 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {coin.change_24h > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : coin.change_24h < 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : null}
                    {coin.change_24h > 0 ? "+" : ""}
                    {coin.change_24h}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className={`font-medium transition-colors ${
                      isUpdating 
                        ? priceChange.direction === 'up'
                          ? 'text-accent'
                          : 'text-destructive'
                        : ''
                    }`}>
                      ${coin.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="font-medium">
                    {coin.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                    {coin.symbol}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-sm text-muted-foreground">Value</span>
                  <span className="font-semibold text-primary">
                    $
                    {(coin.price * coin.balance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    onClick={() => openTradeDialog('buy', coin.symbol)}
                  >
                    <ShoppingCart className="mr-1 h-4 w-4" />
                    Buy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openTradeDialog('sell', coin.symbol)}
                  >
                    <Coins className="mr-1 h-4 w-4" />
                    Sell
                  </Button>
                </div>
              </div>
            </Card>
          );
          })}
        </div>

        <Card className="mt-6 border-border bg-card/50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Prices update in real-time from the database. Admin can manage coins and pricing through the backend.
          </p>
        </Card>

        <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedCoin}</DialogTitle>
              <DialogDescription>
                Enter the amount of {selectedCoin} you want to {tradeType}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({selectedCoin})</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              {selectedCoin && tradeAmount && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {tradeType === 'buy' ? 'Total Cost' : 'You will receive'}:
                    </span>
                    <span className="font-medium">
                      {(parseFloat(tradeAmount) * (getCoinData().find(c => c.symbol === selectedCoin)?.price || 0)).toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              )}
              <Button onClick={handleTrade} className="w-full">
                {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedCoin}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={addFundsDialogOpen} onOpenChange={setAddFundsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funds via PayPal</DialogTitle>
              <DialogDescription>
                Deposit funds to your USDT wallet balance using PayPal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Amount (USD)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1"
                  step="0.01"
                />
              </div>
              <Button 
                onClick={handleAddFunds} 
                className="w-full"
                disabled={isProcessingPayment || !depositAmount}
              >
                {isProcessingPayment ? "Processing..." : "Pay with PayPal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Wallet;
