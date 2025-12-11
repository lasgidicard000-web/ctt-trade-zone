import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft, ExternalLink, CheckCircle, XCircle } from "lucide-react";

const NexoCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Nexo Card</h1>
            <Badge variant="secondary" className="text-sm">Debit & Credit Hybrid</Badge>
          </div>

          <p className="text-xl text-muted-foreground mb-8">
            The overall best crypto debit/credit card combined
          </p>

          {/* Visit Nexo Card Button */}
          <div className="mb-8">
            <Button asChild size="lg" className="gap-2">
              <a href="https://www.nexo.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5" />
                Visit Nexo Card
              </a>
            </Button>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About Nexo Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Founded in 2018, Nexo is a popular centralized finance (CeFi) platform that offers savings accounts, 
                secured loans, exchange services, and a fully-fledged crypto card. Backed by Mastercard, the Nexo Card 
                serves as both a credit and a debit card. Credit card holders get a line of credit, and competitive 
                interest rates start at just 2.9%.
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Nexo Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                All online and in-store purchases are eligible for crypto cashback rewards. Users earn up to 2% 
                depending on the card tier, and Nexo pays rewards in Bitcoin (BTC) or Nexo (NEXO), the native token. 
                Unlike traditional credit cards, the Nexo Card offers flexible repayment terms without credit checks.
              </p>
              <p>
                Nexo's debit card differs from its credit card, yet it is available from the same account. It allows 
                cardholders to make real-world purchases with cryptocurrencies stored in the Nexo balance. When users 
                make a payment, Nexo exchanges the default digital asset for the store's currency. As one of the best 
                credit cards for crypto rewards, Nexo pays up to 14% interest on unspent balances.
              </p>
            </CardContent>
          </Card>

          {/* Credit and Debit Card Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Nexo Credit Card and Debit Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                The card issuer charges foreign transaction fees starting at 0.2%, although specific charges vary 
                depending on the currency and transaction day. It also charges a 2% ATM withdrawal fee if users 
                exceed their monthly limits. Nexo Card users avoid application and annual renewal fees.
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
                <p className="text-foreground">Europe & the UK</p>
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
                  <li>• FX fees from 0.25%</li>
                  <li>• ATM withdrawal fee of 2% after monthly threshold</li>
                  <li>• Credit card APRs from 2.9%</li>
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
                  <li>• Up to 14% interest on card balances</li>
                  <li>• 2% cashback rewards</li>
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
                <p className="text-foreground">BTC, USDT, USDC, and 100+ more</p>
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
                    <span>Account holders receive a debit/credit card under one roof</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Issued by Mastercard, so it works at millions of online and physical stores</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Withdraw cash from ATMs with a monthly fee-free allowance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Unspent debit cards generate interest rewards of up to 14%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                    <span>Interest payments on lines of credit are competitive at just 2.9%</span>
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
                    <span>The card is available in the UK and Europe only</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                    <span>Credit card rewards of just 0.5% when users receive BTC</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-foreground">
                <li>• Hybrid debit and credit card functionality</li>
                <li>• Industry-leading interest rates on balances</li>
                <li>• Low FX fees for international spending</li>
                <li>• Support for 100+ cryptocurrencies</li>
                <li>• Competitive APRs for credit features</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NexoCard;
