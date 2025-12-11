import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft } from "lucide-react";

const MexcCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">MEXC Card</h1>
            <Badge variant="secondary" className="text-sm">Debit</Badge>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About MEXC Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                MEXC offers a prepaid virtual debit card that links to Google and Apple Pay wallets. It allows users to make online and in-store purchases throughout Europe without paying transaction fees. Members who use the card outside of Europe pay a 2% FX fee. MEXC also charges a 1 EUR monthly fee and 1% to top up the card balance.
              </p>
              <p>
                We found that MEXC account holders sell digital assets from their exchange balance and transfer fiat money to the card. Since MEXC supports thousands of cryptocurrencies, it is one of the best crypto debit cards for asset diversity.
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>MEXC Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Once users download the MEXC app and connect it with their card, they receive real-time transaction alerts via pop-up notifications. Users may also enable two-factor authentication as an added security layer and freeze cards to reduce the risk of fraud. Note that MEXC sets a single and monthly transaction limit of 3,000 USDT and 30,000 USDT, respectively.
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
                <p className="text-foreground">Europe</p>
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
                  <li>• No fees on EUR transactions</li>
                  <li>• 2% FX fee for non-EUR purchases</li>
                  <li>• 1% fee to top up the card</li>
                  <li>• 1 EUR monthly fee</li>
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
                <p className="text-muted-foreground">No cashback rewards program</p>
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
                <p className="text-foreground">3,000+ cryptocurrencies via MEXC exchange</p>
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
                  <li>• Best option for everyday purchases in Europe</li>
                  <li>• EUR transactions avoid fees</li>
                  <li>• MEXC account holders have access to thousands of cryptocurrencies</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-red-500">Cons</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li>• Non-EUR transactions incur a 2% FX charge</li>
                  <li>• The card does not offer cashback rewards</li>
                  <li>• Users pay a 1% fee to top up their prepaid card</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Visit Button */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <a 
                href="https://www.mexc.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-center py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                VISIT MEXC CARD
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MexcCard;
