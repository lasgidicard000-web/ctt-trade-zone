import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Set PAYPAL_ENV to "sandbox" when using sandbox credentials.
const PAYPAL_API =
  (Deno.env.get("PAYPAL_ENV") ?? "live").toLowerCase() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('PayPal is not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    console.error('PayPal token request failed:', response.status, data?.error, data?.error_description);
    throw new Error(
      `PayPal authentication failed (${PAYPAL_API}). Verify PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET match this environment.`,
    );
  }
  return data.access_token as string;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, amount, orderId } = await req.json();

    if (action === 'create-order') {
      console.log('Creating PayPal order for amount:', amount);
      
      const accessToken = await getPayPalAccessToken();
      
      const orderResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: amount.toString(),
            },
            description: `Deposit ${amount} USDT to wallet`,
          }],
        }),
      });

      const orderData = await orderResponse.json();
      console.log('PayPal order created:', orderData.id);

      return new Response(JSON.stringify({ orderId: orderData.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'capture-order') {
      console.log('Capturing PayPal order:', orderId);
      
      const accessToken = await getPayPalAccessToken();
      
      const captureResponse = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const captureData = await captureResponse.json();
      console.log('PayPal order captured:', captureData);

      if (captureData.status === 'COMPLETED') {
        const capturedAmount = parseFloat(
          captureData.purchase_units[0].payments.captures[0].amount.value
        );

        // Update or insert wallet balance
        const { data: existingBalance } = await supabase
          .from('wallet_balances')
          .select('balance')
          .eq('user_id', user.id)
          .eq('coin_symbol', 'USDT')
          .single();

        if (existingBalance) {
          await supabase
            .from('wallet_balances')
            .update({ 
              balance: parseFloat(existingBalance.balance) + capturedAmount 
            })
            .eq('user_id', user.id)
            .eq('coin_symbol', 'USDT');
        } else {
          await supabase
            .from('wallet_balances')
            .insert({
              user_id: user.id,
              coin_symbol: 'USDT',
              balance: capturedAmount,
            });
        }

        // Record transaction
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'deposit',
            amount: capturedAmount,
            to_symbol: 'USDT',
            status: 'completed',
          });

        console.log(`Successfully added ${capturedAmount} USDT to user ${user.id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          amount: capturedAmount 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('Payment not completed');
      }
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in paypal-deposit function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
