import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current CCT price
    const { data: cctPrice, error: priceError } = await supabase
      .from('coin_prices')
      .select('price, change_24h')
      .eq('symbol', 'CCT')
      .single();

    if (priceError) throw priceError;

    const currentPrice = parseFloat(cctPrice.price);
    
    // Get the last price history entry to calculate OHLC
    const { data: lastHistory } = await supabase
      .from('coin_price_history')
      .select('*')
      .eq('coin_symbol', 'CCT')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // Generate slight price variation for realistic OHLC
    const variation = currentPrice * 0.001; // 0.1% variation
    const open = lastHistory ? parseFloat(lastHistory.close) : currentPrice;
    const high = currentPrice + (Math.random() * variation);
    const low = currentPrice - (Math.random() * variation);
    const close = currentPrice;
    const volume = Math.random() * 1000 + 500; // Random volume between 500-1500

    // Insert new price history entry
    const { error: insertError } = await supabase
      .from('coin_price_history')
      .insert({
        coin_symbol: 'CCT',
        price: currentPrice,
        open: open,
        high: high,
        low: low,
        close: close,
        volume: volume,
        timestamp: new Date().toISOString(),
      });

    if (insertError) throw insertError;

    // Clean up old entries (keep last 1000 entries)
    const { data: oldEntries } = await supabase
      .from('coin_price_history')
      .select('id')
      .eq('coin_symbol', 'CCT')
      .order('timestamp', { ascending: false })
      .range(1000, 2000);

    if (oldEntries && oldEntries.length > 0) {
      const idsToDelete = oldEntries.map(entry => entry.id);
      await supabase
        .from('coin_price_history')
        .delete()
        .in('id', idsToDelete);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'CCT price history updated',
        data: { price: currentPrice, open, high, low, close, volume }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
