import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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

    console.log('Updating cryptocurrency prices...');

    // Get all coin prices
    const { data: coins, error: fetchError } = await supabase
      .from('coin_prices')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    if (!coins || coins.length === 0) {
      console.log('No coins found to update');
      return new Response(JSON.stringify({ message: 'No coins to update' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update each coin with a realistic price change
    for (const coin of coins) {
      const currentPrice = parseFloat(coin.price);
      
      // Generate a random price change between -2% and +2%
      const changePercent = (Math.random() - 0.5) * 4;
      const priceChange = currentPrice * (changePercent / 100);
      const newPrice = currentPrice + priceChange;
      
      // Calculate 24h change (for display purposes)
      const current24hChange = parseFloat(coin.change_24h || 0);
      const new24hChange = current24hChange + (changePercent * 0.3); // Smooth transition
      
      // Ensure price doesn't go below a minimum threshold
      const minPrice = coin.symbol === 'BTC' ? 20000 : 
                       coin.symbol === 'ETH' ? 1000 : 
                       coin.symbol === 'USDT' ? 0.99 : 10;
      
      const finalPrice = Math.max(newPrice, minPrice);

      // Update the coin price
      const { error: updateError } = await supabase
        .from('coin_prices')
        .update({
          price: finalPrice.toFixed(2),
          change_24h: new24hChange.toFixed(2),
          updated_at: new Date().toISOString(),
        })
        .eq('id', coin.id);

      if (updateError) {
        console.error(`Error updating ${coin.symbol}:`, updateError);
      } else {
        console.log(`Updated ${coin.symbol}: $${currentPrice.toFixed(2)} -> $${finalPrice.toFixed(2)} (${changePercent.toFixed(2)}%)`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Prices updated successfully',
        updated_count: coins.length 
      }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in update-prices function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
