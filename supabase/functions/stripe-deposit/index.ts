import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    const { action, amount, sessionId } = await req.json();
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }

    if (action === 'create-session') {
      console.log('Creating Stripe checkout session for user:', user.id, 'amount:', amount);

      // Create Stripe checkout session
      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[]': 'card',
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': 'USDT Deposit',
          'line_items[0][price_data][unit_amount]': Math.round(amount * 100).toString(),
          'line_items[0][quantity]': '1',
          'mode': 'payment',
          'success_url': `${req.headers.get('origin')}/wallet?payment=success`,
          'cancel_url': `${req.headers.get('origin')}/wallet?payment=cancelled`,
          'metadata[user_id]': user.id,
          'metadata[amount]': amount.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Stripe API error:', error);
        throw new Error('Failed to create Stripe session');
      }

      const session = await response.json();
      console.log('Stripe session created:', session.id);

      return new Response(
        JSON.stringify({ sessionId: session.id, url: session.url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify-session') {
      console.log('Verifying Stripe session:', sessionId);

      // Retrieve session details
      const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to verify Stripe session');
      }

      const session = await response.json();
      console.log('Session status:', session.payment_status);

      if (session.payment_status === 'paid' && session.metadata.user_id === user.id) {
        const depositAmount = parseFloat(session.metadata.amount);

        // Update wallet balance
        const { data: existingBalance } = await supabaseClient
          .from('wallet_balances')
          .select('balance')
          .eq('user_id', user.id)
          .eq('coin_symbol', 'USDT')
          .maybeSingle();

        const currentBalance = existingBalance?.balance || 0;
        const newBalance = parseFloat(currentBalance.toString()) + depositAmount;

        await supabaseClient
          .from('wallet_balances')
          .upsert({
            user_id: user.id,
            coin_symbol: 'USDT',
            balance: newBalance,
          }, { onConflict: 'user_id,coin_symbol' });

        // Record transaction
        await supabaseClient
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'deposit',
            amount: depositAmount,
            from_symbol: 'USD',
            to_symbol: 'USDT',
            status: 'completed',
          });

        console.log('Deposit completed successfully');

        return new Response(
          JSON.stringify({ success: true, amount: depositAmount }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error('Payment not completed or user mismatch');
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
