import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeftRight, TrendingUp } from "lucide-react";

const Trade = () => {
  const [cctAmount, setCctAmount] = useState("");
  const [targetCrypto, setTargetCrypto] = useState("");
  const [loading, setLoading] = useState(false);

  const exchangeRates = {
    btc: 0.000023,
    eth: 0.00035,
    usdt: 1.2,
    bnb: 0.002,
  };

  const calculateReceiveAmount = () => {
    if (!cctAmount || !targetCrypto) return "0.00";
    const rate = exchangeRates[targetCrypto as keyof typeof exchangeRates] || 0;
    return (parseFloat(cctAmount) * rate).toFixed(8);
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cctAmount || !targetCrypto) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    
    setTimeout(() => {
      toast.success("Trade executed successfully!");
      setCctAmount("");
      setTargetCrypto("");
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-accent/10 p-4">
            <ArrowLeftRight className="h-12 w-12 text-accent" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Trade CCT</h1>
          <p className="text-muted-foreground">Exchange your CCT tokens for other cryptocurrencies</p>
        </div>

        <Card className="border-border bg-card p-6">
          <form onSubmit={handleTrade} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cct-amount">CCT Amount</Label>
              <Input
                id="cct-amount"
                type="number"
                step="0.01"
                placeholder="Enter CCT amount"
                value={cctAmount}
                onChange={(e) => setCctAmount(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="flex items-center justify-center">
              <div className="rounded-full bg-muted p-2">
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-crypto">Receive</Label>
              <Select value={targetCrypto} onValueChange={setTargetCrypto}>
                <SelectTrigger id="target-crypto" className="bg-background">
                  <SelectValue placeholder="Choose cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                  <SelectItem value="usdt">Tether (USDT)</SelectItem>
                  <SelectItem value="bnb">Binance Coin (BNB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {cctAmount && targetCrypto && (
              <Card className="bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">You will receive:</span>
                  <span className="text-lg font-semibold text-accent">
                    {calculateReceiveAmount()} {targetCrypto.toUpperCase()}
                  </span>
                </div>
              </Card>
            )}

            <Button 
              type="submit" 
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? "Processing Trade..." : "Execute Trade"}
            </Button>
          </form>
        </Card>

        <Card className="mt-6 border-border bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h3 className="mb-1 font-semibold">Current Exchange Rates</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>1 CCT = {exchangeRates.btc} BTC</li>
                <li>1 CCT = {exchangeRates.eth} ETH</li>
                <li>1 CCT = {exchangeRates.usdt} USDT</li>
                <li>1 CCT = {exchangeRates.bnb} BNB</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Trade;
