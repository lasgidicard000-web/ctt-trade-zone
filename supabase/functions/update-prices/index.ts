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
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!cmcApiKey) {
      throw new Error('COINMARKETCAP_API_KEY is not configured');
    }

    console.log('Fetching live prices from CoinMarketCap...');

    const { data: coins, error: fetchError } = await supabase
      .from('coin_prices')
      .select('*');

    if (fetchError) throw fetchError;

    if (!coins || coins.length === 0) {
      return new Response(JSON.stringify({ message: 'No coins to update' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exclude internal token CCT (Caltex Token) — managed by update-cct-price-history
    const externalCoins = coins.filter((c: any) => c.symbol?.toUpperCase() !== 'CCT');
    const symbols = externalCoins.map((c: any) => c.symbol.toUpperCase());

    if (symbols.length === 0) {
      return new Response(JSON.stringify({ message: 'No external coins to update' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cmcUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(',')}&convert=USD`;
    const cmcResp = await fetch(cmcUrl, {
      headers: {
        'X-CMC_PRO_API_KEY': cmcApiKey,
        'Accept': 'application/json',
      },
    });

    if (!cmcResp.ok) {
      const errBody = await cmcResp.text();
      console.error(`CoinMarketCap request failed [${cmcResp.status}]: ${errBody}`);
      return new Response(
        JSON.stringify({ error: 'CoinMarketCap request failed', status: cmcResp.status, details: errBody }),
        { status: cmcResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cmcJson = await cmcResp.json();
    const quotes = cmcJson?.data ?? {};

    let updated = 0;
    let skipped = 0;

    for (const coin of externalCoins) {
      const sym = coin.symbol.toUpperCase();
      // CMC may return an array or object per symbol; normalize
      const entry = Array.isArray(quotes[sym]) ? quotes[sym][0] : quotes[sym];
      const usd = entry?.quote?.USD;

      if (!usd || typeof usd.price !== 'number') {
        console.warn(`No CMC quote for ${sym}, skipping`);
        skipped++;
        continue;
      }

      const price = usd.price;
      const change24h = typeof usd.percent_change_24h === 'number' ? usd.percent_change_24h : 0;

      // Format: keep more decimals for sub-dollar tokens
      const priceStr = price < 1 ? price.toFixed(6) : price.toFixed(2);

      const { error: updateError } = await supabase
        .from('coin_prices')
        .update({
          price: priceStr,
          change_24h: change24h.toFixed(2),
          updated_at: new Date().toISOString(),
        })
        .eq('id', coin.id);

      if (updateError) {
        console.error(`Error updating ${sym}:`, updateError);
      } else {
        console.log(`Updated ${sym}: $${priceStr} (${change24h.toFixed(2)}% 24h)`);
        updated++;
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Prices updated from CoinMarketCap',
        updated_count: updated,
        skipped_count: skipped,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: any) {
    console.error('Error in update-prices function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
