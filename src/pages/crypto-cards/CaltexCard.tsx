import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft, Star, AlertTriangle, CheckCircle2, Bitcoin } from "lucide-react";
import { toast } from "sonner";

const CaltexCard = () => {
  const [cardType, setCardType] = useState<"visa" | "mastercard">("visa");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [btcAddress, setBtcAddress] = useState("");

  const cardRequirements = {
    visa: { minUsdt: 43500, btcAmount: 0.5 },
    mastercard: { minUsdt: 4300, btcAmount: 0.05 }
  };

  const handleSubmit = (e: React.FormEvent, type: "visa" | "mastercard") => {
    e.preventDefault();
    if (!cardNumber || !expiryDate || !cvv || !cardholderName || !btcAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    const req = cardRequirements[type];
    toast.success(`BTC purchase request submitted. You will receive ${req.btcAmount} BTC to your wallet shortly.`);
  };

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
                <p className="text-foreground">Australia & USA</p>
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
                  Supported Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Crypto (BTC Only)</Badge>
                  <Badge variant="outline">Gift Cards</Badge>
                </div>
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

          {/* BTC Purchase Section */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <Bitcoin className="h-6 w-6" />
                Purchase Bitcoin with Caltex Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="visa" className="w-full" onValueChange={(v) => setCardType(v as "visa" | "mastercard")}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="visa" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Visa Card
                  </TabsTrigger>
                  <TabsTrigger value="mastercard" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Mastercard
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="visa">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-blue-700 dark:text-blue-400">Visa Card Requirements</p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Minimum card balance: <strong>43,500 USDT</strong></li>
                          <li>• You will receive: <strong>0.5 BTC</strong></li>
                          <li>• Only Bitcoin (BTC) purchases are accepted</li>
                          <li>• Available in Australia & USA only</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={(e) => handleSubmit(e, "visa")} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardholderName-visa">Cardholder Name</Label>
                        <Input
                          id="cardholderName-visa"
                          placeholder="John Doe"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber-visa">Visa Card Number</Label>
                        <Input
                          id="cardNumber-visa"
                          placeholder="XXXX XXXX XXXX XXXX"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          maxLength={19}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate-visa">Expiry Date</Label>
                        <Input
                          id="expiryDate-visa"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv-visa">CVV</Label>
                        <Input
                          id="cvv-visa"
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          maxLength={4}
                          type="password"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="btcAddress-visa">Your BTC Wallet Address</Label>
                      <Input
                        id="btcAddress-visa"
                        placeholder="Enter your Bitcoin wallet address to receive 0.5 BTC"
                        value={btcAddress}
                        onChange={(e) => setBtcAddress(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white">
                      <Bitcoin className="h-5 w-5 mr-2" />
                      Purchase 0.5 BTC (Min: 43,500 USDT)
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="mastercard">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-orange-700 dark:text-orange-400">Mastercard Requirements</p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• Minimum card balance: <strong>4,300 USDT</strong></li>
                          <li>• You will receive: <strong>0.05 BTC</strong></li>
                          <li>• Only Bitcoin (BTC) purchases are accepted</li>
                          <li>• Available in Australia & USA only</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={(e) => handleSubmit(e, "mastercard")} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardholderName-mc">Cardholder Name</Label>
                        <Input
                          id="cardholderName-mc"
                          placeholder="John Doe"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber-mc">Mastercard Number</Label>
                        <Input
                          id="cardNumber-mc"
                          placeholder="XXXX XXXX XXXX XXXX"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          maxLength={19}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate-mc">Expiry Date</Label>
                        <Input
                          id="expiryDate-mc"
                          placeholder="MM/YY"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv-mc">CVV</Label>
                        <Input
                          id="cvv-mc"
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          maxLength={4}
                          type="password"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="btcAddress-mc">Your BTC Wallet Address</Label>
                      <Input
                        id="btcAddress-mc"
                        placeholder="Enter your Bitcoin wallet address to receive 0.05 BTC"
                        value={btcAddress}
                        onChange={(e) => setBtcAddress(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                      <Bitcoin className="h-5 w-5 mr-2" />
                      Purchase 0.05 BTC (Min: 4,300 USDT)
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Procedures Section */}
          <Card className="bg-card border-border/50 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Procedures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-foreground list-decimal list-inside">
                <li>Select your card type (Visa or Mastercard) in the form above</li>
                <li>Enter your card details in the appropriate section</li>
                <li>Enter your BTC wallet address where you want to receive your Bitcoin</li>
                <li>Ensure your card meets the minimum balance requirement</li>
                <li>Submit the form to receive your BTC purchase</li>
              </ol>
            </CardContent>
          </Card>

          {/* Summary Section */}
          <Card className="bg-primary/5 border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="text-primary">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                The Caltex card can be used to purchase crypto and gift cards at the moment. The accepted countries for the purchase of crypto is <strong>Australia</strong> and <strong>USA</strong>, likewise the purchase of gift cards.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Visa Card Requirements
                  </h4>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li>• Minimum card balance: <strong>43,500 USDT</strong></li>
                    <li>• BTC amount received: <strong>0.5 BTC</strong></li>
                    <li>• Ensure funds are deposited into your Caltex Visa card</li>
                  </ul>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Mastercard Requirements
                  </h4>
                  <ul className="text-muted-foreground space-y-2 text-sm">
                    <li>• Minimum card balance: <strong>4,300 USDT</strong></li>
                    <li>• BTC amount received: <strong>0.05 BTC</strong></li>
                    <li>• Ensure funds are deposited into your Caltex Mastercard</li>
                  </ul>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-amber-700 dark:text-amber-400">Gift Card Warning</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      For the gift card section, ensure that you can purchase a gift card worth any amount of your choice. Before purchasing gift cards with your CALTEX card, be careful and be sure you're transacting with the right merchants, as <strong>CALTEX won't be held responsible for lost money</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-foreground">
                <li>• <strong>Zero fees</strong> on all transactions</li>
                <li>• Native support for <strong>Caltex Token (CCT)</strong></li>
                <li>• Perfect for Bitcoin and gift card purchases</li>
                <li>• Available in USA and Australia</li>
                <li>• Simple and straightforward card experience</li>
                <li>• No hidden charges or conversion fees</li>
                <li>• <strong>Visa:</strong> 43,500 USDT minimum → 0.5 BTC</li>
                <li>• <strong>Mastercard:</strong> 4,300 USDT minimum → 0.05 BTC</li>
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
                it's the perfect companion for Caltex ecosystem users looking to purchase Bitcoin and gift cards.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CaltexCard;
