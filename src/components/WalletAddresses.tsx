import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertTriangle, Lock, CheckCircle, Bitcoin } from "lucide-react";
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
  btcBalance?: number;
  btcPrice?: number;
}

// Fixed BTC payment wallet address for CTTTradeZone
const FIXED_BTC_ADDRESS = 'bc1qhez04ha009fea990ut2ywr7jtcq0nq8c0hcr2a';

export const WalletAddresses = ({ coins, userId, btcBalance = 0, btcPrice = 0 }: WalletAddressesProps) => {
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isWalletActive = btcBalance * btcPrice >= 500;

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
    // Use fixed address for BTC, generate for others
    if (symbol === 'BTC') {
      return FIXED_BTC_ADDRESS;
    }
    
    // Generate a mock wallet address based on the coin type
    const prefix = symbol === 'ETH' ? '0x' : symbol === 'USDT' ? '0x' : '0x';
    const chars = '0123456789abcdefABCDEF';
    let address = prefix;
    const length = 40;
    
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

  const handleLockedAddressClick = () => {
    toast.error('This address is locked. Deposit $500 BTC first to activate your wallet.');
  };

  // Sort coins to put BTC first
  const sortedCoins = [...coins].sort((a, b) => {
    if (a.symbol === 'BTC') return -1;
    if (b.symbol === 'BTC') return 1;
    return 0;
  });

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
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-amber-500" />
          Your Wallet Addresses
        </CardTitle>
        <CardDescription>
          Deposit BTC to activate your CTTTradeZone wallet and unlock all features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isWalletActive ? (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              <strong>Wallet Activated!</strong> All cryptocurrency addresses are unlocked and ready for deposits.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <strong>Important:</strong> Only BTC deposits are accepted for wallet activation. 
              Deposit a minimum of $500 worth of BTC to activate your wallet and unlock all cryptocurrency addresses.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {sortedCoins.map((coin) => {
            const address = addresses.find(a => a.coin_symbol === coin.symbol);
            if (!address) return null;

            const isBTC = coin.symbol === 'BTC';
            const isUnlocked = isBTC || isWalletActive;
            // Always use fixed BTC address for display
            const displayAddress = isBTC ? FIXED_BTC_ADDRESS : address.wallet_address;

            return (
              <div
                key={coin.symbol}
                className={`flex flex-col p-4 rounded-lg border transition-colors ${
                  isUnlocked 
                    ? 'border-green-500 bg-green-500/5 hover:bg-green-500/10' 
                    : 'border-muted bg-muted/30 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {coin.icon_url && (
                      <img 
                        src={coin.icon_url} 
                        alt={coin.name}
                        className={`w-8 h-8 rounded-full ${!isUnlocked && 'grayscale opacity-50'}`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${!isUnlocked && 'text-muted-foreground'}`}>
                          {coin.name}
                        </span>
                        {isUnlocked ? (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {isBTC ? 'ACTIVE DEPOSIT' : 'ACTIVE'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            ACTIVATION REQUIRED
                          </Badge>
                        )}
                      </div>
                      <div className={`text-sm truncate font-mono ${
                        isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/50'
                      }`}>
                        {displayAddress}
                      </div>
                    </div>
                  </div>
                  {isUnlocked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(displayAddress, coin.symbol)}
                      className="flex-shrink-0 border-green-500 text-green-600 hover:bg-green-500/10"
                    >
                      {copiedAddress === displayAddress ? (
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
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLockedAddressClick}
                      disabled
                      className="flex-shrink-0 opacity-50 cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Locked
                    </Button>
                  )}
                </div>
                {!isUnlocked && (
                  <p className="text-xs text-muted-foreground mt-2 pl-12">
                    Deposit $500 BTC to unlock this address for deposits
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
