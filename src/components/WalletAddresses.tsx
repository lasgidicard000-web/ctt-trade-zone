import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { CoinPrice } from "@/hooks/useRealtimePrices";

interface WalletAddress {
  id: string;
  coin_symbol: string;
  wallet_address: string;
}

interface WalletAddressesProps {
  coins: CoinPrice[];
  userId: string;
}

export const WalletAddresses = ({ coins, userId }: WalletAddressesProps) => {
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, [userId, coins]);

  const fetchAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_wallet_addresses')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      setAddresses(data || []);

      // Generate addresses for coins that don't have one
      const existingSymbols = new Set(data?.map(a => a.coin_symbol) || []);
      const missingCoins = coins.filter(coin => !existingSymbols.has(coin.symbol));

      if (missingCoins.length > 0) {
        await generateMissingAddresses(missingCoins);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load wallet addresses');
      setLoading(false);
    }
  };

  const generateMissingAddresses = async (coins: CoinPrice[]) => {
    try {
      const newAddresses = coins.map(coin => ({
        user_id: userId,
        coin_symbol: coin.symbol,
        wallet_address: generateWalletAddress(coin.symbol),
      }));

      const { error } = await supabase
        .from('crypto_wallet_addresses')
        .insert(newAddresses);

      if (error) throw error;

      // Refresh addresses
      await fetchAddresses();
    } catch (error: any) {
      console.error('Error generating addresses:', error);
    }
  };

  const generateWalletAddress = (symbol: string): string => {
    // Generate a mock wallet address based on the coin type
    const prefix = symbol === 'BTC' ? '1' : symbol === 'ETH' ? '0x' : symbol === 'USDT' ? '0x' : '0x';
    const chars = '0123456789abcdefABCDEF';
    let address = prefix;
    const length = symbol === 'BTC' ? 33 : 40;
    
    for (let i = 0; i < length; i++) {
      address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return address;
  };

  const copyToClipboard = async (address: string, symbol: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success(`${symbol} address copied!`);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet Addresses</CardTitle>
          <CardDescription>Loading your cryptocurrency wallet addresses...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Wallet Addresses</CardTitle>
        <CardDescription>
          Use these addresses to receive cryptocurrency deposits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {coins.map((coin) => {
            const address = addresses.find(a => a.coin_symbol === coin.symbol);
            if (!address) return null;

            return (
              <div
                key={coin.symbol}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {coin.icon_url && (
                    <img 
                      src={coin.icon_url} 
                      alt={coin.name}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{coin.name}</div>
                    <div className="text-sm text-muted-foreground truncate font-mono">
                      {address.wallet_address}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(address.wallet_address, coin.symbol)}
                  className="flex-shrink-0"
                >
                  {copiedAddress === address.wallet_address ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
