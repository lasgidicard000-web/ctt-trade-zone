import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft } from "lucide-react";
import DebitCardForm from "@/components/DebitCardForm";

const CoinbaseCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Coinbase Card</h1>
            <Badge variant="secondary" className="text-sm">Debit</Badge>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About Coinbase Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Coinbase, the regulated exchange with over 100 million verified users, offers a crypto debit card for U.S. consumers. Americans make domestic purchases without paying fees, and the card supports both USD and digital assets. USD top-ups run smoothly, since Coinbase supports ACH and domestic wires.
              </p>
              <p>
                When users make purchases with crypto, Coinbase does not charge conversion fees. The card supports all Coinbase markets, including top meme coins like DOGE, Pepe (PEPE), and Shiba Inu (SHIB).
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Coinbase Debit Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                As a prepaid card, new customers complete the application process with soft or hard inquiries. This benefit makes the Coinbase Card suitable for all credit profiles. In terms of rewards, cardholders typically earn up to 4% on eligible purchases without monthly limits. However, reward rates often change, so check the Coinbase app for real-time updates.
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
                <p className="text-foreground">United States</p>
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
                  <li>• No fees on domestic USD purchases</li>
                  <li>• No crypto conversion fees</li>
                  <li>• Spread applied to crypto conversions</li>
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
                  <li>• Up to 4% cashback on eligible purchases</li>
                  <li>• No monthly reward limits</li>
                  <li>• Rewards in 320+ digital assets</li>
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
                <p className="text-foreground">BTC, ETH, DOGE, PEPE, SHIB, USDC, and 320+ more</p>
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
                  <li>• Fund the card with USD or crypto fee-free</li>
                  <li>• Fast application process without credit checks</li>
                  <li>• Earn crypto rewards in over 320 digital assets</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-red-500">Cons</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li>• The cashback reward rate changes frequently</li>
                  <li>• Not available outside of the U.S.</li>
                  <li>• The exchange applies a spread to crypto conversions</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DebitCardForm
            cardName="Coinbase"
            supportedCoins={["BTC", "ETH", "DOGE", "PEPE", "SHIB", "USDC", "SOL", "XRP", "LINK", "AVAX"]}
            gradientClass="bg-gradient-to-r from-blue-500 to-blue-600"
          />

          {/* Visit Button */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <a 
                href="https://www.coinbase.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                VISIT COINBASE CARD
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CoinbaseCard;
