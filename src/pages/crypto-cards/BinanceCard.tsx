import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft } from "lucide-react";
import DebitCardForm from "@/components/DebitCardForm";

const BinanceCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Binance Card</h1>
            <Badge variant="secondary" className="text-sm">Debit</Badge>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About Binance Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Binance Card is a Mastercard debit card for Brazilian residents. Binance traders link their account balance to the card, which lets them make purchases with existing crypto investments. Cardholders earn cashback of between 0.5% and 2%, depending on their monthly spending. However, Binance Card limits monthly rewards to just 120 BRL.
              </p>
              <p>
                Regarding pricing, Binance does not charge application, annual, or issuance fees. The exchange offers free delivery to any Brazilian residential address, and cardholders avoid ATM fees on the first two withdrawals each month. Users incur a 1% crypto conversion fee on online and in-store purchases, and FX charges of up to 2% on non-BRL transactions.
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Binance Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Research shows that Binance Card supports the best altcoins to buy, from ETH, SOL, and Cardano (ADA) to BNB (BNB), XRP (XRP), and USDC (USDC). The card implements daily, monthly, and annual spending limits of 25,000 BRL, 50,000 BRL, and 200,000 BRL, respectively.
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
                <p className="text-foreground">Brazil</p>
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
                  <li>• No application, annual, or issuance fees</li>
                  <li>• Two free ATM withdrawals monthly</li>
                  <li>• FX fees up to 2% on non-BRL transactions</li>
                  <li>• 1% crypto conversion fee on purchases</li>
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
                  <li>• 0.5% to 2% cashback based on monthly spending</li>
                  <li>• Capped at 120 BRL per month</li>
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
                <p className="text-foreground">ETH, SOL, ADA, BNB, XRP, USDC, and more</p>
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
                  <li>• A popular crypto debit card for Brazilian users</li>
                  <li>• Spend ETH, BNB, XRP, SOL, and other top altcoins in local and online stores</li>
                  <li>• Earn crypto cashback of up to 2%</li>
                  <li>• Connects directly with the world's biggest crypto exchange</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-red-500">Cons</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li>• Small limits on cashback rewards and monthly purchases</li>
                  <li>• Charges up to 2% on non-BRL transactions</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DebitCardForm
            cardName="Binance"
            supportedCoins={["ETH", "SOL", "ADA", "BNB", "XRP", "USDC", "USDT", "DOT", "AVAX", "MATIC"]}
            gradientClass="bg-gradient-to-r from-yellow-500 to-orange-500"
          />

          {/* Visit Button */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <a 
                href="https://www.binance.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                VISIT BINANCE CARD
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BinanceCard;
