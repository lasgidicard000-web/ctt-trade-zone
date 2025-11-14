import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, amount, cryptoCurrency, paymentId } = await req.json();
    console.log('NOWPayments request:', { action, amount, cryptoCurrency, paymentId, userId: user.id });

    if (action === 'create-payment') {
      // Get estimated price
      const estimateResponse = await fetch(
        `${NOWPAYMENTS_API_URL}/estimate?amount=${amount}&currency_from=usd&currency_to=${cryptoCurrency}`,
        {
          headers: {
            'x-api-key': nowpaymentsApiKey,
          },
        }
      );

      if (!estimateResponse.ok) {
        const errorText = await estimateResponse.text();
        console.error('Estimate failed:', errorText);
        throw new Error('Failed to get price estimate');
      }

      const estimateData = await estimateResponse.json();
      console.log('Estimate data:', estimateData);

      // Create payment
      const paymentResponse = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
        method: 'POST',
        headers: {
          'x-api-key': nowpaymentsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_amount: amount,
          price_currency: 'usd',
          pay_currency: cryptoCurrency,
          order_id: `${user.id}_${Date.now()}`,
          order_description: `Crypto deposit - ${amount} USD`,
          ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-webhook`,
        }),
      });

      if (!paymentResponse.ok) {
        const errorText = await paymentResponse.text();
        console.error('Payment creation failed:', errorText);
        throw new Error('Failed to create payment');
      }

      const paymentData = await paymentResponse.json();
      console.log('Payment created:', paymentData);

      // Store payment in database
      const { error: insertError } = await supabase
        .from('crypto_payments')
        .insert({
          user_id: user.id,
          payment_id: paymentData.payment_id,
          pay_address: paymentData.pay_address,
          pay_amount: paymentData.pay_amount,
          pay_currency: cryptoCurrency,
          price_amount: amount,
          price_currency: 'USD',
          order_id: paymentData.order_id,
          payment_status: paymentData.payment_status,
        });

      if (insertError) {
        console.error('Failed to store payment:', insertError);
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          paymentId: paymentData.payment_id,
          payAddress: paymentData.pay_address,
          payAmount: paymentData.pay_amount,
          payCurrency: cryptoCurrency,
          paymentStatus: paymentData.payment_status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'check-status') {
      // Get payment status from NOWPayments
      const statusResponse = await fetch(
        `${NOWPAYMENTS_API_URL}/payment/${paymentId}`,
        {
          headers: {
            'x-api-key': nowpaymentsApiKey,
          },
        }
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to get payment status');
      }

      const statusData = await statusResponse.json();
      console.log('Payment status:', statusData);

      // Update payment in database
      const { error: updateError } = await supabase
        .from('crypto_payments')
        .update({
          payment_status: statusData.payment_status,
          actually_paid: statusData.actually_paid,
          outcome_amount: statusData.outcome_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update payment:', updateError);
      }

      // If payment is finished, update wallet balance
      if (statusData.payment_status === 'finished' || statusData.payment_status === 'confirmed') {
        const usdAmount = parseFloat(statusData.price_amount);

        // Update or insert USDT balance
        const { data: existingBalance } = await supabase
          .from('wallet_balances')
          .select('*')
          .eq('user_id', user.id)
          .eq('coin_symbol', 'USDT')
          .single();

        if (existingBalance) {
          await supabase
            .from('wallet_balances')
            .update({
              balance: parseFloat(existingBalance.balance) + usdAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
            .eq('coin_symbol', 'USDT');
        } else {
          await supabase
            .from('wallet_balances')
            .insert({
              user_id: user.id,
              coin_symbol: 'USDT',
              balance: usdAmount,
            });
        }

        // Record transaction
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'deposit',
          amount: usdAmount,
          from_symbol: statusData.pay_currency,
          to_symbol: 'USDT',
          status: 'completed',
        });

        // Update payment completion timestamp
        await supabase
          .from('crypto_payments')
          .update({
            completed_at: new Date().toISOString(),
          })
          .eq('payment_id', paymentId)
          .eq('user_id', user.id);

        console.log('Wallet balance updated successfully');
      }

      return new Response(
        JSON.stringify({
          paymentStatus: statusData.payment_status,
          actuallyPaid: statusData.actually_paid,
          outcomeAmount: statusData.outcome_amount,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in nowpayments-deposit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
