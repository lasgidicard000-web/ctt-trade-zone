import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  icon_url: string | null;
  updated_at: string;
}

interface PriceChange {
  symbol: string;
  direction: 'up' | 'down' | 'neutral';
  timestamp: number;
}

export const useRealtimePrices = () => {
  const [prices, setPrices] = useState<CoinPrice[]>([]);
  const [priceChanges, setPriceChanges] = useState<Map<string, PriceChange>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    const fetchPrices = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('coin_prices')
          .select('*')
          .order('symbol');

        if (fetchError) throw fetchError;

        setPrices(data.map(coin => ({
          ...coin,
          price: typeof coin.price === 'string' ? parseFloat(coin.price) : coin.price,
          change_24h: typeof coin.change_24h === 'string' ? parseFloat(coin.change_24h || '0') : (coin.change_24h || 0),
        })));
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchPrices();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('coin_prices_realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'coin_prices',
        },
        (payload) => {
          console.log('Price update received:', payload);
          
          const updatedCoin = payload.new as any;
          const oldCoin = payload.old as any;
          
          setPrices((currentPrices) => {
            const newPrices = currentPrices.map(coin => {
              if (coin.id === updatedCoin.id) {
                const newPrice = parseFloat(String(updatedCoin.price));
                const oldPrice = parseFloat(String(oldCoin.price));
                
                // Track price direction
                const direction = newPrice > oldPrice ? 'up' : 
                                 newPrice < oldPrice ? 'down' : 'neutral';
                
                setPriceChanges(prev => {
                  const newMap = new Map(prev);
                  newMap.set(coin.symbol, {
                    symbol: coin.symbol,
                    direction,
                    timestamp: Date.now(),
                  });
                  return newMap;
                });

                // Clear the animation after 2 seconds
                setTimeout(() => {
                  setPriceChanges(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(coin.symbol);
                    return newMap;
                  });
                }, 2000);

                return {
                  ...coin,
                  price: newPrice,
                  change_24h: parseFloat(updatedCoin.change_24h || 0),
                  updated_at: updatedCoin.updated_at,
                };
              }
              return coin;
            });
            return newPrices;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { prices, priceChanges, loading, error };
};
