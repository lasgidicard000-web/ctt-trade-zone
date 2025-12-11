import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Globe, DollarSign, Gift, Coins, ArrowLeft, Star, ExternalLink, AlertTriangle, CheckCircle2, Bitcoin } from "lucide-react";
import { toast } from "sonner";

const CaltexCard = () => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [btcAddress, setBtcAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiryDate || !cvv || !cardholderName || !btcAddress) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success("BTC purchase request submitted. You will receive 0.5 BTC to your wallet shortly.");
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
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">Important Requirements</p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• Minimum purchase: <strong>0.5 BTC</strong></li>
                      <li>• Your card must have a minimum balance worth 0.5 BTC</li>
                      <li>• Only Bitcoin (BTC) purchases are accepted</li>
                      <li>• Available in Australia & USA only</li>
                    </ul>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Doe"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      maxLength={19}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      maxLength={4}
                      type="password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="btcAddress">Your BTC Wallet Address</Label>
                  <Input
                    id="btcAddress"
                    placeholder="Enter your Bitcoin wallet address to receive 0.5 BTC"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
                  <Bitcoin className="h-5 w-5 mr-2" />
                  Purchase 0.5 BTC Minimum
                </Button>
              </form>
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
                <li>Insert your Caltex Visa/Mastercard details in the form above</li>
                <li>Enter your BTC wallet address where you want to receive your Bitcoin</li>
                <li>Ensure your card has a minimum balance worth 0.5 BTC</li>
                <li>Submit the form to receive your 0.5 BTC minimum purchase</li>
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
              
              <div className="bg-background/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground">For Crypto Purchases:</h4>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>• Ensure that all the funds in your CALTEX dashboard has been deposited into your specific Caltex Visa/Mastercard</li>
                  <li>• Ensure that you have a minimum amount balance worth of 0.5 BTC in your card</li>
                  <li>• The minimum purchase is 0.5 BTC worth of Bitcoin to your specific wallet</li>
                </ul>
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
                <li>• Minimum BTC purchase: 0.5 BTC</li>
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
