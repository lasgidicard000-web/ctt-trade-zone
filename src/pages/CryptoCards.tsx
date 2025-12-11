import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ArrowRight } from "lucide-react";

const cryptoCards = [
  {
    id: "nexo",
    name: "Nexo",
    bestFor: "The overall best crypto debit/credit card combined",
    type: "Debit and credit hybrid",
    regions: "Europe & the UK",
    rewards: "Up to 14% interest, 2% cashback",
    color: "from-blue-500 to-blue-700",
  },
  {
    id: "gemini",
    name: "Gemini",
    bestFor: "U.S. credit card rewards without conversion fees",
    type: "Credit",
    regions: "The U.S.",
    rewards: "Up to 4% cashback, $200 welcome bonus",
    color: "from-cyan-500 to-teal-600",
  },
  {
    id: "binance",
    name: "Binance",
    bestFor: "Making everyday purchases in BRL",
    type: "Debit",
    regions: "Brazil",
    rewards: "2% cashback (capped at 120 BRL/month)",
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: "bybit",
    name: "Bybit",
    bestFor: "Earning interest and cashback rewards",
    type: "Debit",
    regions: "Most countries where Bybit operates",
    rewards: "Up to 8% interest, 10% cashback",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "caltex",
    name: "Caltex",
    bestFor: "Making purchases with zero charges on Bitcoin and gift cards",
    type: "Debit",
    regions: "The U.S., Europe & Australia",
    rewards: "No fees, supports CCT",
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "crypto-com",
    name: "Crypto.com",
    bestFor: "Fee-free USD purchases",
    type: "Credit",
    regions: "The U.S.",
    rewards: "Up to 6% cashback, Netflix & Spotify rebates",
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "mexc",
    name: "MEXC",
    bestFor: "Online and in-store spending throughout Europe",
    type: "Debit",
    regions: "Europe",
    rewards: "3,000+ supported markets",
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    bestFor: "Cashback rewards without credit checks",
    type: "Debit",
    regions: "The U.S.",
    rewards: "Up to 4% cashback, 320+ coins",
    color: "from-blue-500 to-blue-600",
  },
];

const CryptoCards = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="text-primary hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <CreditCard className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Crypto Cards</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore the best crypto debit and credit cards for spending your digital assets in the real world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {cryptoCards.map((card) => (
            <Link key={card.id} to={`/crypto-cards/${card.id}`}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <div className={`h-24 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center mb-3`}>
                    <CreditCard className="h-12 w-12 text-white" />
                  </div>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{card.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {card.type}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {card.bestFor}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regions:</span>
                      <span className="text-foreground font-medium text-right max-w-[60%]">{card.regions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rewards:</span>
                      <span className="text-foreground font-medium text-right max-w-[60%]">{card.rewards}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-primary text-sm font-medium">
                    Learn more <ArrowRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CryptoCards;
