import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft, Star } from "lucide-react";

const CaltexCard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/crypto-cards" className="inline-flex items-center text-primary hover:underline text-sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Crypto Cards
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="h-48 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center mb-8 relative">
            <CreditCard className="h-24 w-24 text-white" />
            <Badge className="absolute top-4 right-4 bg-white/20 text-white border-white/30">
              <Star className="h-3 w-3 mr-1 fill-current" /> Featured
            </Badge>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-4xl font-bold text-foreground">Caltex</h1>
            <Badge variant="secondary" className="text-sm">Debit</Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20">Supports CCT</Badge>
          </div>

          <p className="text-xl text-muted-foreground mb-8">
            Making purchases with zero charges on Bitcoin and gift cards
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">The U.S., Europe & Australia</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Fees
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Zero Fees</Badge>
                  <span className="text-foreground">No fees on transactions</span>
                </div>
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
                <p className="text-muted-foreground">No rewards program - focus on zero fees</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50 border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Supported Coins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">BTC</Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/30">CCT</Badge>
                  <Badge variant="outline">TRX</Badge>
                  <Badge variant="outline">USDT</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-foreground">
                <li>• <strong>Zero fees</strong> on all transactions</li>
                <li>• Native support for <strong>Caltex Token (CCT)</strong></li>
                <li>• Perfect for Bitcoin and gift card purchases</li>
                <li>• Available in U.S., Europe, and Australia</li>
                <li>• Simple and straightforward card experience</li>
                <li>• No hidden charges or conversion fees</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20 mt-6">
            <CardHeader>
              <CardTitle className="text-primary">Why Choose Caltex?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Caltex Card stands out with its zero-fee approach, making it ideal for users who want to spend their crypto 
                without worrying about transaction fees, FX fees, or hidden charges. With native CCT token support, 
                it's the perfect companion for Caltex ecosystem users.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaltexCard;
