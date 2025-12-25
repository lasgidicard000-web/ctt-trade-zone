import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting price history generation...');

    // Fetch current prices from coin_prices table
    const { data: currentPrices, error: pricesError } = await supabase
      .from('coin_prices')
      .select('symbol, price, change_24h');

    if (pricesError || !currentPrices) {
      throw new Error(`Failed to fetch current prices: ${pricesError?.message}`);
    }

    console.log(`Found ${currentPrices.length} coins to generate history for`);

    const results: Record<string, any> = {};
    const now = new Date();

    for (const coin of currentPrices) {
      try {
        const symbol = coin.symbol.toUpperCase();
        const currentPrice = typeof coin.price === 'string' ? parseFloat(coin.price) : coin.price;
        const change24h = typeof coin.change_24h === 'string' ? parseFloat(coin.change_24h || '0') : (coin.change_24h || 0);

        console.log(`Generating history for ${symbol}: price=${currentPrice}, change=${change24h}%`);

        // Calculate starting price based on 24h change
        const startPrice = currentPrice / (1 + change24h / 100);
        const priceRange = currentPrice - startPrice;

        // Generate 168 hourly data points (7 days)
        const records = [];
        const hoursToGenerate = 168;

        for (let i = 0; i < hoursToGenerate; i++) {
          const timestamp = new Date(now.getTime() - (hoursToGenerate - i) * 60 * 60 * 1000);
          
          // Create realistic price movement
          const progress = i / hoursToGenerate;
          const basePrice = startPrice + priceRange * progress;
          
          // Add realistic volatility based on coin type
          const volatilityFactor = symbol === 'USDT' ? 0.001 : symbol === 'BTC' ? 0.02 : 0.03;
          const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.5) + Math.sin(i * 0.7)) * basePrice * volatilityFactor;
          const randomWalk = (Math.random() - 0.5) * basePrice * volatilityFactor * 0.5;
          
          const price = Math.max(basePrice + noise + randomWalk, basePrice * 0.9);
          
          // Generate OHLC data
          const highVar = price * (1 + Math.random() * volatilityFactor);
          const lowVar = price * (1 - Math.random() * volatilityFactor);
          const openVar = price * (1 + (Math.random() - 0.5) * volatilityFactor);
          const closeVar = price * (1 + (Math.random() - 0.5) * volatilityFactor);

          records.push({
            coin_symbol: symbol,
            price: price,
            open: openVar,
            high: Math.max(price, highVar, openVar, closeVar),
            low: Math.min(price, lowVar, openVar, closeVar),
            close: closeVar,
            volume: Math.random() * 1000000 * (symbol === 'BTC' ? 100 : symbol === 'ETH' ? 50 : 10),
            timestamp: timestamp.toISOString(),
          });
        }

        // Delete existing history for this coin
        const { error: deleteError } = await supabase
          .from('coin_price_history')
          .delete()
          .eq('coin_symbol', symbol);

        if (deleteError) {
          console.error(`Error deleting old data for ${symbol}:`, deleteError);
        }

        // Insert new records in batches
        const batchSize = 50;
        let insertedCount = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          const { error: insertError } = await supabase
            .from('coin_price_history')
            .insert(batch);

          if (insertError) {
            console.error(`Error inserting batch for ${symbol}:`, insertError);
          } else {
            insertedCount += batch.length;
          }
        }

        results[symbol] = { success: true, records: insertedCount };
        console.log(`Inserted ${insertedCount} records for ${symbol}`);

      } catch (coinError) {
        console.error(`Error processing ${coin.symbol}:`, coinError);
        results[coin.symbol] = { error: String(coinError) };
      }
    }

    console.log('Price history generation completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-price-history:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
