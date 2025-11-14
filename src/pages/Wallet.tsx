import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet as WalletIcon, TrendingUp, TrendingDown, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from "@supabase/supabase-js";

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
  const [coinPrices, setCoinPrices] = useState<CoinPrice[]>([]);
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);

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
    // Fetch coin prices
    const { data: prices, error: pricesError } = await supabase
      .from("coin_prices")
      .select("symbol, name, price, change_24h")
      .order("symbol");

    if (pricesError) {
      toast({
        title: "Error",
        description: "Failed to fetch coin prices",
        variant: "destructive",
      });
    } else {
      setCoinPrices(prices || []);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-6xl py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <WalletIcon className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Wallet Dashboard</h1>
          <p className="text-muted-foreground">View all available cryptocurrencies and your portfolio</p>
          <div className="mt-4">
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
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {getCoinData().map((coin) => (
            <Card
              key={coin.symbol}
              className="border-border bg-card p-6 transition-all hover:border-primary/50"
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
                  <span className="font-medium">
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
              </div>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-border bg-card/50 p-4">
          <p className="text-center text-sm text-muted-foreground">
            Prices update in real-time from the database. Admin can manage coins and pricing through the backend.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
