import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import DebitCardForm from "@/components/DebitCardForm";

const GeminiCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Gemini Card</h1>
            <Badge variant="secondary" className="text-sm">Credit</Badge>
          </div>

          <p className="text-xl text-muted-foreground mb-8">
            U.S. credit card rewards without conversion fees
          </p>

          {/* Visit Gemini Card Button */}
          <div className="mb-8">
            <Button asChild size="lg" className="gap-2">
              <a href="https://www.gemini.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5" />
                Visit Gemini Card
              </a>
            </Button>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About Gemini Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                The Gemini Credit Card works like a regular credit card but with generous cashback rewards. 
                Available in the U.S. only, the card offers 4% cashback on gas, EV, and transit purchases, 
                3% on dining, 2% on groceries, and 1% on all other transactions. Cardholders get their cashback 
                rewards in over 50 assets, including the best cryptocurrencies like BTC, Ethereum (ETH), 
                Dogecoin (DOGE), and Solana (SOL).
              </p>
              <p>
                As a conventional credit card, U.S. residents complete an application, and Gemini runs a credit check. 
                If approved, applicants receive a credit limit and a repayment APR, with Gemini capping the APR at 
                34.99% on purchases. While Gemini Card charges 3% on cash advances (including ATM withdrawals), it 
                waives FX fees on international payments. This perk lets users make purchases overseas without paying 
                additional fees.
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Gemini Credit Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                First-time applicants receive an introductory bonus of $200, which Gemini pays in the user's 
                preferred digital assets. The exchange adds the bonus when users spend $3,000 in the first 90 days.
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
                <p className="text-foreground">The U.S.</p>
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
                  <li>• 3% cash advance fee</li>
                  <li>• APRs up to 34.99% (purchases)</li>
                  <li>• APRs up to 29.99% (cash advance)</li>
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
                  <li>• Up to 4% on everyday spending</li>
                  <li>• $200 welcome bonus for new users</li>
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
                <p className="text-foreground">BTC, ETH, DOGE, and 50+ more</p>
              </CardContent>
            </Card>
          </div>

          {/* Pros and Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  Pros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>One of the best crypto credit cards for U.S. residents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Make purchases without paying FX or conversion fees</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Receive up to 4% crypto cashback depending on the spending category</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>New customers earn a $200 bonus after spending $3,000 in the first 90 days</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <XCircle className="h-5 w-5" />
                  Cons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                    <span>The top-tier cashback rate caps at $300 per month (1% for purchases thereafter)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                    <span>Uncleared statement balances incur APRs of up to 34.99%</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-foreground">
                <li>• Generous welcome bonus for new users</li>
                <li>• High cashback rates on everyday purchases</li>
                <li>• No conversion fees for crypto rewards</li>
                <li>• Support for 50+ cryptocurrencies</li>
                <li>• Backed by regulated U.S. exchange</li>
              </ul>
            </CardContent>
          </Card>

          <DebitCardForm
            cardName="Gemini"
            supportedCoins={["BTC", "ETH", "DOGE", "SOL", "USDC", "USDT", "SHIB", "MATIC", "LINK", "UNI"]}
            gradientClass="bg-gradient-to-r from-cyan-500 to-teal-600"
          />
        </div>
      </div>
    </div>
  );
};

export default GeminiCard;
