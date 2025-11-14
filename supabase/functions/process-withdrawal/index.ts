import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Withdrawal fee structure
const WITHDRAWAL_FEE_PERCENTAGE = 0.01; // 1%
const MIN_WITHDRAWAL_FEE = 1; // $1 minimum fee
const MIN_WITHDRAWAL_AMOUNT = 10; // $10 minimum withdrawal

// Validate wallet address format (simplified validation)
function isValidWalletAddress(address: string): boolean {
  // Basic validation for common crypto wallet formats
  // BTC: starts with 1, 3, or bc1, length 26-35
  // ETH: starts with 0x, length 42
  // USDT (ERC-20): same as ETH
  // USDT (TRC-20): starts with T, length 34
  
  if (!address || address.length < 26) return false;
  
  const btcPattern = /^(1|3|bc1)[a-zA-Z0-9]{25,34}$/;
  const ethPattern = /^0x[a-fA-F0-9]{40}$/;
  const trcPattern = /^T[a-zA-Z0-9]{33}$/;
  
  return btcPattern.test(address) || ethPattern.test(address) || trcPattern.test(address);
}

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

    const { action, amount, walletAddress, withdrawalId } = await req.json();

    if (action === 'request-withdrawal') {
      console.log('Processing withdrawal request for user:', user.id);

      // Validate amount
      if (!amount || amount < MIN_WITHDRAWAL_AMOUNT) {
        throw new Error(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`);
      }

      // Validate wallet address
      if (!walletAddress || !isValidWalletAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      // Calculate fee
      const calculatedFee = Math.max(amount * WITHDRAWAL_FEE_PERCENTAGE, MIN_WITHDRAWAL_FEE);
      const totalDeduction = amount + calculatedFee;

      // Check user's USDT balance
      const { data: balance, error: balanceError } = await supabaseClient
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('coin_symbol', 'USDT')
        .maybeSingle();

      if (balanceError) throw balanceError;

      const currentBalance = balance?.balance || 0;
      if (parseFloat(currentBalance.toString()) < totalDeduction) {
        throw new Error('Insufficient balance (including withdrawal fee)');
      }

      // Deduct from wallet balance
      const newBalance = parseFloat(currentBalance.toString()) - totalDeduction;
      
      await supabaseClient
        .from('wallet_balances')
        .upsert({
          user_id: user.id,
          coin_symbol: 'USDT',
          balance: newBalance,
        }, { onConflict: 'user_id,coin_symbol' });

      // Create withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabaseClient
        .from('withdrawals')
        .insert({
          user_id: user.id,
          amount: amount,
          wallet_address: walletAddress,
          fee: calculatedFee,
          status: 'pending',
          notes: 'Withdrawal request submitted for processing',
        })
        .select()
        .single();

      if (withdrawalError) throw withdrawalError;

      // Record transaction
      await supabaseClient
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'withdrawal',
          amount: amount,
          from_symbol: 'USDT',
          to_symbol: 'USDT',
          status: 'pending',
        });

      console.log('Withdrawal request created:', withdrawal.id);

      return new Response(
        JSON.stringify({
          success: true,
          withdrawalId: withdrawal.id,
          amount: amount,
          fee: calculatedFee,
          total: totalDeduction,
          status: 'pending',
          message: 'Withdrawal request submitted successfully. Processing typically takes 1-3 business days.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'cancel-withdrawal') {
      console.log('Cancelling withdrawal:', withdrawalId);

      // Get withdrawal details
      const { data: withdrawal, error: fetchError } = await supabaseClient
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!withdrawal) throw new Error('Withdrawal not found');

      // Can only cancel pending withdrawals
      if (withdrawal.status !== 'pending') {
        throw new Error('Can only cancel pending withdrawals');
      }

      // Refund to wallet
      const { data: balance } = await supabaseClient
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('coin_symbol', 'USDT')
        .maybeSingle();

      const currentBalance = balance?.balance || 0;
      const refundAmount = parseFloat(withdrawal.amount.toString()) + parseFloat(withdrawal.fee.toString());
      const newBalance = parseFloat(currentBalance.toString()) + refundAmount;

      await supabaseClient
        .from('wallet_balances')
        .upsert({
          user_id: user.id,
          coin_symbol: 'USDT',
          balance: newBalance,
        }, { onConflict: 'user_id,coin_symbol' });

      // Update withdrawal status
      await supabaseClient
        .from('withdrawals')
        .update({
          status: 'cancelled',
          notes: 'Cancelled by user',
        })
        .eq('id', withdrawalId);

      console.log('Withdrawal cancelled and funds refunded');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Withdrawal cancelled and funds refunded to your wallet',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
