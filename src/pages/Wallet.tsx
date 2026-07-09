import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, LogOut, Shield, MessageCircle, Gamepad2, ShoppingCart, Coins, Plus, Trophy, Radio, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";
import PriceAlerts from "@/components/PriceAlerts";
import AlertNotifications from "@/components/AlertNotifications";
import { RewardsSection } from "@/components/RewardsSection";
import { WalletAddresses } from "@/components/WalletAddresses";
import { DepositHistory } from "@/components/DepositHistory";
import { WalletStatusCard } from "@/components/WalletStatusCard";
import { ActiveInvestmentCard } from "@/components/ActiveInvestmentCard";
import { GiftCardApprovalTracker } from "@/components/GiftCardApprovalTracker";
import { GlobalBankConversion } from "@/components/GlobalBankConversion";
import { AGCSBCreditBadge } from "@/components/AGCSBCreditBadge";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { useTransactionNotifications } from "@/hooks/useTransactionNotifications";
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
  
  // Enable real-time transaction notifications
  useTransactionNotifications(user);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [selectedCoin, setSelectedCoin] = useState<string>('');
  const [tradeAmount, setTradeAmount] = useState('');
  const [addFundsDialogOpen, setAddFundsDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'bank' | 'crypto'>('paypal');
  const [selectedCrypto, setSelectedCrypto] = useState<'BTC' | 'ETH' | 'USDT'>('BTC');
  const [cryptoPaymentInfo, setCryptoPaymentInfo] = useState<any>(null);
  const [btcQrCode, setBtcQrCode] = useState<string>('');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [bankTransferInfo, setBankTransferInfo] = useState<any>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [withdrawalFee, setWithdrawalFee] = useState(0);
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

  // Generate QR code for the fixed BTC deposit address
  useEffect(() => {
    const generateQr = async () => {
      try {
        const dataUrl = await QRCode.toDataURL('bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk', {
          width: 128,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
        setBtcQrCode(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };
    if (addFundsDialogOpen && paymentMethod === 'crypto' && selectedCrypto === 'BTC') {
      generateQr();
    }
  }, [addFundsDialogOpen, paymentMethod, selectedCrypto]);
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const paymentStatus = urlParams.get('payment');

    if (sessionId && paymentStatus === 'success') {
      // Verify and process Stripe payment
      const verifyStripePayment = async () => {
        try {
          const { data, error } = await supabase.functions.invoke(
            'stripe-deposit',
            {
              body: { action: 'verify-session', sessionId },
            }
          );

          if (error) throw error;

          if (data.success) {
            toast({
              title: "Funds added!",
              description: `Successfully added $${data.amount} USDT to your wallet`,
            });
            fetchData();
          }
        } catch (error) {
          toast({
            title: "Payment verification failed",
            description: "Could not verify your payment",
            variant: "destructive",
          });
        }
        // Clean URL
        window.history.replaceState({}, '', '/wallet');
      };

      verifyStripePayment();
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment cancelled",
        description: "Your payment was cancelled",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/wallet');
    }
  }, [toast]);

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
      if (paymentMethod === 'crypto') {
        const { data, error } = await supabase.functions.invoke(
          'nowpayments-deposit',
          {
            body: {
              action: 'create-payment',
              amount,
              cryptoCurrency: selectedCrypto.toLowerCase(),
            },
          }
        );

        if (error) throw error;

        setCryptoPaymentInfo(data);
        setIsProcessingPayment(false);
        
        toast({
          title: "Crypto payment created",
          description: "Please send the exact amount to the address shown",
        });
      } else if (paymentMethod === 'paypal') {
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
      } else if (paymentMethod === 'stripe') {
        // Create Stripe checkout session
        const { data: sessionData, error: sessionError } = await supabase.functions.invoke(
          'stripe-deposit',
          {
            body: { action: 'create-session', amount },
          }
        );

        if (sessionError) throw sessionError;

        // Redirect to Stripe checkout
        window.location.href = sessionData.url;
      } else if (paymentMethod === 'bank') {
        // Initiate bank transfer
        const { data: transferData, error: transferError } = await supabase.functions.invoke(
          'bank-transfer',
          {
            body: { action: 'initiate-transfer', amount },
          }
        );

        if (transferError) throw transferError;

        setBankTransferInfo(transferData);
        setIsProcessingPayment(false);
        
        toast({
          title: "Bank transfer initiated",
          description: "Please follow the instructions to complete your transfer",
        });
      }
    } catch (error) {
      setIsProcessingPayment(false);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const handleCheckCryptoPayment = async () => {
    if (!cryptoPaymentInfo?.paymentId) return;

    setIsCheckingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'nowpayments-deposit',
        {
          body: {
            action: 'check-status',
            paymentId: cryptoPaymentInfo.paymentId,
          },
        }
      );

      if (error) throw error;

      if (data.paymentStatus === 'finished' || data.paymentStatus === 'confirmed') {
        toast({
          title: "Payment confirmed!",
          description: "Your wallet has been credited",
        });
        
        setAddFundsDialogOpen(false);
        setCryptoPaymentInfo(null);
        setDepositAmount('');
        fetchData();
      } else if (data.paymentStatus === 'failed' || data.paymentStatus === 'expired') {
        toast({
          title: "Payment " + data.paymentStatus,
          description: "Please try again with a new payment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment status: " + data.paymentStatus,
          description: "Waiting for confirmation...",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to check payment status",
        variant: "destructive",
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Calculate withdrawal fee when amount changes
  useEffect(() => {
    const amount = parseFloat(withdrawAmount);
    if (amount && amount > 0) {
      const fee = Math.max(amount * 0.01, 1); // 1% or $1 minimum
      setWithdrawalFee(fee);
    } else {
      setWithdrawalFee(0);
    }
  }, [withdrawAmount]);

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum withdrawal amount is $10",
        variant: "destructive",
      });
      return;
    }

    if (!walletAddress) {
      toast({
        title: "Wallet address required",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'process-withdrawal',
        {
          body: {
            action: 'request-withdrawal',
            amount,
            walletAddress,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Withdrawal requested!",
        description: data.message,
      });

      setWithdrawDialogOpen(false);
      setWithdrawAmount('');
      setWalletAddress('');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error.message || "Failed to process withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
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
            <Button onClick={() => navigate("/transactions")} variant="default" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Transactions
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
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => setAddFundsDialogOpen(true)} 
                variant="default" 
                size="sm"
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Funds
              </Button>
              <Button 
                onClick={() => setWithdrawDialogOpen(true)} 
                variant="outline" 
                size="sm"
                className="mt-4"
              >
                <WalletIcon className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </div>
          </div>
        </Card>

        {user && <div className="mb-6"><PriceAlerts user={user} coins={coinPrices} /></div>}

        {/* Active Investment */}
        {user && <ActiveInvestmentCard userId={user.id} />}

        {/* Wallet Status and Activation Requirements */}
        {user && (
          <WalletStatusCard
            btcBalance={walletBalances.find(b => b.coin_symbol === 'BTC')?.balance || 0}
            btcPrice={coinPrices.find(c => c.symbol === 'BTC')?.price || 0}
          />
        )}


        {user && <AGCSBCreditBadge userId={user.id} />}
        {user && <GiftCardApprovalTracker userId={user.id} />}

        {user && <div className="mb-6"><RewardsSection user={user} onRewardClaimed={fetchData} /></div>}

        {user && <div className="mb-6"><WalletAddresses coins={coinPrices} userId={user.id} btcBalance={walletBalances.find(b => b.coin_symbol === 'BTC')?.balance || 0} btcPrice={coinPrices.find(c => c.symbol === 'BTC')?.price || 0} /></div>}

        {/* Global Bank Conversion Section */}
        <GlobalBankConversion />

        {user && <div className="mb-6"><DepositHistory /></div>}

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

        <Dialog open={addFundsDialogOpen} onOpenChange={(open) => {
          setAddFundsDialogOpen(open);
          if (!open) {
            setBankTransferInfo(null);
            setCryptoPaymentInfo(null);
            setDepositAmount('');
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Funds to Wallet</DialogTitle>
              <DialogDescription>
                Choose your preferred payment method to deposit USDT
              </DialogDescription>
            </DialogHeader>
            
            {!bankTransferInfo && !cryptoPaymentInfo ? (
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

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={paymentMethod === 'crypto' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('crypto')}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <Coins className="h-5 w-5" />
                      <span className="text-xs">Crypto</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'paypal' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('paypal')}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <WalletIcon className="h-5 w-5" />
                      <span className="text-xs">PayPal</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'stripe' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('stripe')}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <Shield className="h-5 w-5" />
                      <span className="text-xs">Card</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'bank' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('bank')}
                      className="flex flex-col items-center gap-1 h-auto py-3"
                    >
                      <Coins className="h-5 w-5" />
                      <span className="text-xs">Bank</span>
                    </Button>
                  </div>
                </div>

                {paymentMethod === 'crypto' && (
                  <div className="space-y-2">
                    <Label>Select Cryptocurrency</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={selectedCrypto === 'BTC' ? 'default' : 'outline'}
                        onClick={() => setSelectedCrypto('BTC')}
                        className="flex flex-col items-center gap-1 h-auto py-3"
                      >
                        <span className="text-lg">₿</span>
                        <span className="text-xs">Bitcoin</span>
                      </Button>
                      <Button
                        variant={selectedCrypto === 'ETH' ? 'default' : 'outline'}
                        onClick={() => setSelectedCrypto('ETH')}
                        className="flex flex-col items-center gap-1 h-auto py-3"
                      >
                        <span className="text-lg">Ξ</span>
                        <span className="text-xs">Ethereum</span>
                      </Button>
                      <Button
                        variant={selectedCrypto === 'USDT' ? 'default' : 'outline'}
                        onClick={() => setSelectedCrypto('USDT')}
                        className="flex flex-col items-center gap-1 h-auto py-3"
                      >
                        <span className="text-lg">₮</span>
                        <span className="text-xs">USDT</span>
                      </Button>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleAddFunds} 
                  className="w-full"
                  disabled={isProcessingPayment || !depositAmount}
                >
                  {isProcessingPayment ? "Processing..." : 
                    paymentMethod === 'crypto' ? `Pay with ${selectedCrypto}` :
                    paymentMethod === 'paypal' ? "Pay with PayPal" :
                    paymentMethod === 'stripe' ? "Pay with Card" :
                    "Get Bank Instructions"
                  }
                </Button>
              </div>
            ) : cryptoPaymentInfo ? (
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Crypto Payment Instructions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount to Send:</span>
                      <span className="font-mono font-semibold">{cryptoPaymentInfo.payAmount} {cryptoPaymentInfo.payCurrency?.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Payment Address:</span>
                      <div className="flex flex-col sm:flex-row items-start gap-3">
                        {btcQrCode && (
                          <img
                            src={btcQrCode}
                            alt="BTC payment QR code"
                            className="w-28 h-28 rounded border bg-white p-1 shrink-0"
                          />
                        )}
                        <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                          <code className="flex-1 rounded bg-background p-2 text-xs break-all">
                            bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText('bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk');
                              toast({ title: "Copied to clipboard" });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium capitalize">{cryptoPaymentInfo.paymentStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Important:</strong> Send the exact amount to the address above. 
                    The payment will be automatically confirmed once received on the blockchain.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleCheckCryptoPayment}
                    disabled={isCheckingPayment}
                    className="flex-1"
                  >
                    {isCheckingPayment ? "Checking..." : "Check Payment Status"}
                  </Button>
                  <Button 
                    onClick={() => {
                      setCryptoPaymentInfo(null);
                      setDepositAmount('');
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="rounded-lg bg-muted p-4 space-y-3">
                  <h4 className="font-semibold text-sm">Bank Transfer Instructions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-medium">{bankTransferInfo.instructions.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-medium">{bankTransferInfo.instructions.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Routing Number:</span>
                      <span className="font-medium">{bankTransferInfo.instructions.routingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Name:</span>
                      <span className="font-medium">{bankTransferInfo.instructions.bankName}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-border">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-primary">${bankTransferInfo.instructions.amount}</span>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-muted-foreground mb-1">Reference Code:</p>
                      <code className="block bg-background px-3 py-2 rounded text-xs font-mono">
                        {bankTransferInfo.reference}
                      </code>
                      <p className="text-xs text-muted-foreground mt-2">
                        ⚠️ Include this reference code in your transfer notes
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Funds will be credited within 2-3 business days after confirmation
                </p>
                <Button 
                  onClick={() => {
                    setBankTransferInfo(null);
                    setAddFundsDialogOpen(false);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={withdrawDialogOpen} onOpenChange={(open) => {
          setWithdrawDialogOpen(open);
          if (!open) {
            setWithdrawAmount('');
            setWalletAddress('');
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Withdraw USDT</DialogTitle>
              <DialogDescription>
                Withdraw your USDT to an external wallet address
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance:</span>
                  <span className="font-semibold">
                    ${(walletBalances.find(b => b.coin_symbol === 'USDT')?.balance || 0).toLocaleString()} USDT
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Withdrawal Fee:</span>
                  <span className="font-medium">1% (min $1)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Minimum Amount:</span>
                  <span className="font-medium">$10</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Withdrawal Amount (USDT)</Label>
                <Input
                  id="withdrawAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="10"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="walletAddress">Wallet Address</Label>
                <Input
                  id="walletAddress"
                  type="text"
                  placeholder="Enter USDT wallet address (ERC-20, TRC-20, or BTC)"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Supported formats: ERC-20 (0x...), TRC-20 (T...), or BTC address
                </p>
              </div>

              {withdrawAmount && parseFloat(withdrawAmount) >= 10 && (
                <div className="rounded-lg bg-muted p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Withdrawal Amount:</span>
                    <span className="font-medium">${parseFloat(withdrawAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-medium">${withdrawalFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground font-semibold">Total Deducted:</span>
                    <span className="font-bold text-destructive">
                      ${(parseFloat(withdrawAmount) + withdrawalFee).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  ⚠️ Important Notice
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Processing time: 1-3 business days</li>
                  <li>Ensure wallet address is correct - transactions cannot be reversed</li>
                  <li>Network fees may apply on the blockchain</li>
                  <li>Only withdraw to addresses you control</li>
                </ul>
              </div>

              <Button 
                onClick={handleWithdrawal} 
                className="w-full"
                disabled={isProcessingPayment || !withdrawAmount || !walletAddress || parseFloat(withdrawAmount) < 10}
              >
                {isProcessingPayment ? "Processing..." : "Request Withdrawal"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Wallet;
