import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft } from "lucide-react";

const CryptoComCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mb-8">
            <CreditCard className="h-24 w-24 text-white" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Crypto.com Card</h1>
            <Badge variant="secondary" className="text-sm">Credit</Badge>
          </div>

          {/* About Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>About Crypto.com Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Issued by Visa and available in the U.S. only, Crypto.com offers a rewards-based credit card across various tiers. The entry-level card requires no monthly fees or Cronos (CRO) staking, and it offers cashback rewards of 1.5% on eligible purchases. Like all card tiers, Crypto.com pays rewards in CRO tokens only.
              </p>
              <p>
                The Plus and Pro cards offer 3.5% and 4.5% cashback, although members pay $4.99 or $29.99 in monthly subscription fees. Alternatively, cardholders avoid monthly fees when they stake $500 or $5,000 in CRO tokens. The highest card tiers require $50,000 or $500,000 in CRO staking and offer 5% and 6% cashback, yet their steep minimums make them unaffordable for most crypto investors. The Crypto.com Card also offers 100% rebates on popular streaming services like Spotify and Netflix.
              </p>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="bg-card border-border/50 mb-8">
            <CardHeader>
              <CardTitle>Crypto.com Card Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                All card members receive Visa Signature benefits, which include purchase protection and 24/7 concierge services. New applicants receive a welcome bonus depending on the selected tier. The minimum and maximum bonuses are $100 and $2,500, which require $1,500 to $20,000 spending in the first three months of opening the account.
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
                  <li>• No fees on U.S. purchases</li>
                  <li>• 5% ATM/cash advance fee</li>
                  <li>• 3% FX fee on international</li>
                  <li>• Monthly fees: $0 to $29.99 (tier-dependent)</li>
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
                  <li>• 1.5% to 6% cashback (tier-dependent)</li>
                  <li>• 100% Netflix rebate</li>
                  <li>• 100% Spotify rebate</li>
                  <li>• Welcome bonus up to $2,500</li>
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
                <p className="text-foreground">CRO tokens only (for rewards)</p>
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
                  <li>• New members receive a welcome bonus of up to $2,500</li>
                  <li>• Top-tier cardholders earn cashback rewards of up to 6%</li>
                  <li>• No fees on purchases within the U.S.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-red-500">Cons</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-foreground">
                  <li>• CRO tokens are the only cashback asset available</li>
                  <li>• High APRs on uncleared statement balances</li>
                  <li>• Cardholders pay 5% fees to withdraw cash from ATMs</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Visit Button */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <a 
                href="https://www.crypto.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-4 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
              >
                VISIT CRYPTO.COM CARD
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CryptoComCard;
