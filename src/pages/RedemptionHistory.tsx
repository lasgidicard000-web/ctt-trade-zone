import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Gift, ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Redemption {
  id: string;
  gift_card_code: string;
  gift_card_type: string | null;
  crypto_symbol: string;
  wallet_address: string;
  screenshot_url: string | null;
  status: string;
  amount: number | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

const giftCardTypes: Record<string, string> = {
  amazon: "Amazon",
  itunes: "iTunes / Apple",
  googleplay: "Google Play",
  steam: "Steam",
  ebay: "eBay",
  walmart: "Walmart",
  target: "Target",
  visa: "Visa Prepaid",
  mastercard: "Mastercard Prepaid",
  amex: "American Express",
  netflix: "Netflix",
  spotify: "Spotify",
  playstation: "PlayStation",
  xbox: "Xbox",
  razer: "Razer Gold",
  other: "Other",
};

const cryptoNames: Record<string, string> = {
  btc: "Bitcoin (BTC)",
  eth: "Ethereum (ETH)",
  usdt: "Tether (USDT)",
  bnb: "Binance Coin (BNB)",
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return (
        <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
          <XCircle className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    case "processing":
      return (
        <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
  }
};

const RedemptionHistory = () => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      fetchRedemptions(user.id);
    };

    checkAuth();
  }, [navigate]);

  const fetchRedemptions = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("redemptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching redemptions:", error);
    } else {
      setRedemptions(data || []);
    }
    setLoading(false);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("redemptions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "redemptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchRedemptions(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl py-12">
        <div className="mb-8">
          <Link to="/redeem">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Redeem
            </Button>
          </Link>
          <div className="text-center">
            <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
              <Gift className="h-12 w-12 text-primary" />
            </div>
            <h1 className="mb-2 text-4xl font-bold">Redemption History</h1>
            <p className="text-muted-foreground">
              Track the status of your gift card redemptions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : redemptions.length === 0 ? (
          <Card className="border-border bg-card p-8 text-center">
            <Gift className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No redemptions yet</h3>
            <p className="mb-4 text-muted-foreground">
              You haven't made any gift card redemptions yet.
            </p>
            <Link to="/redeem">
              <Button>Redeem a Gift Card</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <Card
                key={redemption.id}
                className="border-border bg-card p-6 transition-all hover:border-primary/50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {redemption.gift_card_type
                          ? giftCardTypes[redemption.gift_card_type] ||
                            redemption.gift_card_type
                          : "Gift Card"}
                      </h3>
                      {getStatusBadge(redemption.status)}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium text-foreground">Code:</span>{" "}
                        {redemption.gift_card_code.slice(0, 4)}****
                        {redemption.gift_card_code.slice(-4)}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Cryptocurrency:
                        </span>{" "}
                        {cryptoNames[redemption.crypto_symbol] ||
                          redemption.crypto_symbol.toUpperCase()}
                      </p>
                      <p>
                        <span className="font-medium text-foreground">
                          Wallet:
                        </span>{" "}
                        {redemption.wallet_address.slice(0, 8)}...
                        {redemption.wallet_address.slice(-6)}
                      </p>
                      {redemption.amount && (
                        <p>
                          <span className="font-medium text-foreground">
                            Amount:
                          </span>{" "}
                          ${redemption.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(redemption.created_at), "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(redemption.created_at), "h:mm a")}
                    </p>
                    {redemption.screenshot_url && (
                      <a
                        href={redemption.screenshot_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs text-primary hover:underline"
                      >
                        View Screenshot
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RedemptionHistory;
