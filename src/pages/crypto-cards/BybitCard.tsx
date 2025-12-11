import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft } from "lucide-react";

const BybitCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Bybit Card</h1>
            <Badge variant="secondary" className="text-sm">Debit</Badge>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About Bybit Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Our research shows that Bybit Card is one of the leading crypto reward cards. Verified exchange users receive 10% cashback rewards for five spending categories: dining, transport, fashion, travel, and beauty & wellness. Users must add at least $100 to their Bybit Card to qualify, and the monthly cashback is capped at $150 for new users, or $75 for existing customers.
              </p>
              <p>
                The crypto debit card also offers a 10% discount on purchases made with partnered merchants, including Amazon Prime, Netflix, and Spotify. Bybit users with a VIP status receive additional perks. They earn interest of up to 8% on card balances, while standard users get 4%. Other VIP benefits include airport lounge access and full rebates on popular streaming services.
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Bybit Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                The provider offers up to $100 in free monthly ATM withdrawals and charges 2% for anything above that threshold. Purchases incur a 0.9% crypto conversion fee, and on non-USD payments, cardholders pay a 1% FX fee. No application or annual fees apply, and Bybit typically approves new members within one business day.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">Most countries where Bybit operates</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-foreground">
                  <li>• No application or annual fees</li>
                  <li>• $100 free ATM withdrawals monthly, then 2%</li>
                  <li>• 1% FX fee on non-USD payments</li>
                  <li>• 0.9% crypto conversion fee</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-foreground">
                  <li>• 10% cashback on 5 categories</li>
                  <li>• Up to 8% interest on card balances (VIP)</li>
                  <li>• 10% discount with partner merchants</li>
                  <li>• 100% rebate on streaming services (VIP)</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Supported Coins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">BTC, ETH, MNT, BNB, XRP, TON, USDT, USDC</p>
              </CardContent>
            </Card>
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-green-500">Pros</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li>• Generous rewards include 10% cashback and 8% interest on card balances</li>
                  <li>• Get a 100% rebate on streaming services</li>
                  <li>• $100 in free monthly ATM withdrawals</li>
                  <li>• Free global card delivery via DHL</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-red-500">Cons</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li>• European users no longer receive cashback rewards</li>
                  <li>• USD is the only supported fiat currency</li>
                  <li>• Lower reward rates outside of the core spending categories</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Visit Button */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <a 
                href="https://www.bybit.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                VISIT BYBIT CARD
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BybitCard;
