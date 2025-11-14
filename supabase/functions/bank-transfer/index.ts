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

    const { action, amount, transferReference } = await req.json();

    if (action === 'initiate-transfer') {
      console.log('Initiating bank transfer for user:', user.id, 'amount:', amount);

      // Generate unique reference code
      const reference = `BT-${user.id.substring(0, 8)}-${Date.now()}`;

      // In a real app, you would:
      // 1. Generate bank account details for the user to transfer to
      // 2. Store pending transfer in database
      // 3. Set up webhook to listen for bank transfer confirmation

      // For demo purposes, we'll return instructions
      return new Response(
        JSON.stringify({
          reference,
          instructions: {
            accountName: 'Crypto Wallet Platform',
            accountNumber: '1234567890',
            routingNumber: '021000021',
            bankName: 'Demo Bank',
            amount: amount,
            reference: reference,
            note: 'Include reference code in transfer notes',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'confirm-transfer') {
      console.log('Confirming bank transfer:', transferReference);

      // In a real app, this would verify the transfer with the bank
      // For demo, we'll simulate immediate confirmation
      
      // Simulate a 2-3 business day delay check
      // In production, this would be triggered by a webhook from your bank/payment processor
      
      return new Response(
        JSON.stringify({
          status: 'pending',
          message: 'Transfer is being processed. Funds will be credited within 2-3 business days.',
          estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin endpoint to process pending transfers (would normally be triggered by webhook)
    if (action === 'process-transfer') {
      const { transferId, depositAmount } = await req.json();

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

      return new Response(
        JSON.stringify({ success: true, amount: depositAmount }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
