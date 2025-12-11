import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, X, Scale } from "lucide-react";

const allCards = [
  {
    id: "nexo",
    name: "Nexo",
    type: "Debit & Credit",
    regions: "Europe & UK",
    fees: "FX 0.25%, ATM 2%",
    rewards: "14% interest, 2% cashback",
    coins: "BTC, USDT, USDC, 100+",
    color: "from-blue-500 to-blue-700",
  },
  {
    id: "gemini",
    name: "Gemini",
    type: "Credit",
    regions: "U.S.",
    fees: "3% cash advance",
    rewards: "4% cashback, $200 bonus",
    coins: "BTC, ETH, DOGE, 50+",
    color: "from-cyan-500 to-teal-600",
  },
  {
    id: "binance",
    name: "Binance",
    type: "Debit",
    regions: "Brazil",
    fees: "FX 2%, 1% conversion",
    rewards: "2% cashback (120 BRL cap)",
    coins: "BTC, ETH, ADA, SOL, XRP",
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: "bybit",
    name: "Bybit",
    type: "Debit",
    regions: "Most countries",
    fees: "FX 1%, 0.9% conversion",
    rewards: "8% interest, 10% cashback",
    coins: "BTC, ETH, MNT, BNB, XRP",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "caltex",
    name: "Caltex",
    type: "Debit",
    regions: "U.S., Europe, Australia",
    fees: "No fees",
    rewards: "No rewards",
    coins: "BTC, CCT, TRX, USDT",
    color: "from-emerald-500 to-green-600",
  },
  {
    id: "crypto-com",
    name: "Crypto.com",
    type: "Credit",
    regions: "U.S.",
    fees: "5% cash advance, 3% FX",
    rewards: "6% cashback, Netflix/Spotify",
    coins: "CRO rewards only",
    color: "from-indigo-500 to-purple-600",
  },
  {
    id: "mexc",
    name: "MEXC",
    type: "Debit",
    regions: "Europe",
    fees: "2% non-EUR, 1 EUR/mo",
    rewards: "No rewards",
    coins: "3,000+ markets",
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    type: "Debit",
    regions: "U.S.",
    fees: "No fees",
    rewards: "Up to 4% cashback",
    coins: "BTC, ETH, USDC, 320+",
    color: "from-blue-500 to-blue-600",
  },
];

const CryptoCardComparison = () => {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const toggleCard = (cardId: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : prev.length < 4
        ? [...prev, cardId]
        : prev
    );
  };

  const clearSelection = () => {
    setSelectedCards([]);
    setShowComparison(false);
  };

  const comparedCards = allCards.filter((card) =>
    selectedCards.includes(card.id)
  );

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" />
            <CardTitle>Compare Cards</CardTitle>
          </div>
          {selectedCards.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCards.length} selected</Badge>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Select up to 4 cards to compare side by side
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Card Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {allCards.map((card) => (
            <div
              key={card.id}
              onClick={() => toggleCard(card.id)}
              className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                selectedCards.includes(card.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`h-10 w-10 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center`}
                >
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs font-medium text-center">
                  {card.name}
                </span>
                <Checkbox
                  checked={selectedCards.includes(card.id)}
                  className="pointer-events-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Compare Button */}
        {selectedCards.length >= 2 && (
          <Button
            onClick={() => setShowComparison(true)}
            className="w-full"
            size="lg"
          >
            <Scale className="h-4 w-4 mr-2" />
            Compare {selectedCards.length} Cards
          </Button>
        )}

        {/* Comparison Table */}
        {showComparison && comparedCards.length >= 2 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-32 font-semibold">Feature</TableHead>
                  {comparedCards.map((card) => (
                    <TableHead key={card.id} className="text-center min-w-36">
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className={`h-8 w-8 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center`}
                        >
                          <CreditCard className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-semibold">{card.name}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Card Type</TableCell>
                  {comparedCards.map((card) => (
                    <TableCell key={card.id} className="text-center">
                      <Badge variant="outline">{card.type}</Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Regions</TableCell>
                  {comparedCards.map((card) => (
                    <TableCell key={card.id} className="text-center text-sm">
                      {card.regions}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Fees</TableCell>
                  {comparedCards.map((card) => (
                    <TableCell
                      key={card.id}
                      className={`text-center text-sm ${
                        card.fees === "No fees"
                          ? "text-green-500 font-medium"
                          : ""
                      }`}
                    >
                      {card.fees}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Rewards</TableCell>
                  {comparedCards.map((card) => (
                    <TableCell
                      key={card.id}
                      className={`text-center text-sm ${
                        card.rewards !== "No rewards"
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {card.rewards}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Supported Coins</TableCell>
                  {comparedCards.map((card) => (
                    <TableCell key={card.id} className="text-center text-sm">
                      {card.coins}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {selectedCards.length === 1 && (
          <p className="text-center text-sm text-muted-foreground">
            Select at least one more card to compare
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CryptoCardComparison;
