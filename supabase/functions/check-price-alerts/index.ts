import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log("Checking price alerts...");

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabaseClient
      .from('price_alerts')
      .select('*')
      .eq('is_active', true);

    if (alertsError) {
      console.error("Error fetching alerts:", alertsError);
      throw alertsError;
    }

    if (!alerts || alerts.length === 0) {
      console.log("No active alerts to check");
      return new Response(
        JSON.stringify({ message: "No active alerts", checked: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current prices
    const { data: prices, error: pricesError } = await supabaseClient
      .from('coin_prices')
      .select('symbol, price');

    if (pricesError) {
      console.error("Error fetching prices:", pricesError);
      throw pricesError;
    }

    const priceMap = new Map(prices?.map(p => [p.symbol, Number(p.price)]) || []);
    let triggeredCount = 0;

    // Check each alert
    for (const alert of alerts) {
      const currentPrice = priceMap.get(alert.coin_symbol);
      
      if (!currentPrice) {
        console.log(`No price found for ${alert.coin_symbol}`);
        continue;
      }

      const targetPrice = Number(alert.target_price);
      let shouldTrigger = false;

      if (alert.condition === 'above' && currentPrice >= targetPrice) {
        shouldTrigger = true;
      } else if (alert.condition === 'below' && currentPrice <= targetPrice) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        console.log(`Alert triggered for ${alert.coin_symbol}: ${currentPrice} ${alert.condition} ${targetPrice}`);
        
        // Create notification
        const { error: notifError } = await supabaseClient
          .from('alert_notifications')
          .insert({
            user_id: alert.user_id,
            alert_id: alert.id,
            coin_symbol: alert.coin_symbol,
            target_price: targetPrice,
            actual_price: currentPrice,
            condition: alert.condition,
          });

        if (notifError) {
          console.error("Error creating notification:", notifError);
        }

        // Deactivate alert
        const { error: updateError } = await supabaseClient
          .from('price_alerts')
          .update({ 
            is_active: false, 
            triggered_at: new Date().toISOString() 
          })
          .eq('id', alert.id);

        if (updateError) {
          console.error("Error updating alert:", updateError);
        } else {
          triggeredCount++;
        }
      }
    }

    console.log(`Checked ${alerts.length} alerts, triggered ${triggeredCount}`);

    return new Response(
      JSON.stringify({ 
        message: "Alerts checked successfully", 
        checked: alerts.length,
        triggered: triggeredCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in check-price-alerts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
