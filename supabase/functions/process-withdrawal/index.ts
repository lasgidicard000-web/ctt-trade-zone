import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Withdrawal fee structure — fee % now sourced from plan_entitlements
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

      // Load entitlements for this user (tier-based fee + daily cap)
      const { data: ent, error: entError } = await supabaseClient
        .rpc('get_user_entitlements', { _user_id: user.id });
      if (entError) throw entError;

      const feePct = Number(ent?.withdrawal_fee_pct ?? 0.01);
      const dailyCap = Number(ent?.daily_withdrawal_cap ?? 2000);
      const tierName = ent?.plan_name ?? 'No Active Plan';

      // Enforce daily cap (sum of today's withdrawals for this user, excluding rejected/cancelled)
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { data: todays, error: todaysErr } = await supabaseClient
        .from('withdrawals')
        .select('amount, status')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());
      if (todaysErr) throw todaysErr;

      const usedToday = (todays ?? [])
        .filter((w: any) => !['rejected', 'cancelled'].includes(w.status))
        .reduce((sum: number, w: any) => sum + Number(w.amount), 0);

      if (usedToday + Number(amount) > dailyCap) {
        throw new Error(
          `Daily withdrawal cap of $${dailyCap.toLocaleString()} for ${tierName} exceeded. Used today: $${usedToday.toLocaleString()}.`
        );
      }

      // Calculate fee
      const calculatedFee = Math.max(amount * feePct, MIN_WITHDRAWAL_FEE);
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

    // Admin actions
    if (action === 'approve-withdrawal') {
      const { withdrawalId, transactionHash } = await req.json();
      
      console.log('Admin approving withdrawal:', withdrawalId);

      // Check if user is admin
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        throw new Error('Unauthorized - Admin access required');
      }

      // Update withdrawal status
      const { error: updateError } = await supabaseClient
        .from('withdrawals')
        .update({
          status: 'completed',
          transaction_hash: transactionHash,
          processed_at: new Date().toISOString(),
          notes: `Approved by admin ${user.email}`,
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Update transaction status
      await supabaseClient
        .from('transactions')
        .update({ status: 'completed' })
        .eq('user_id', user.id)
        .eq('type', 'withdrawal');

      console.log('Withdrawal approved successfully');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Withdrawal approved and processed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reject-withdrawal') {
      const { withdrawalId, reason } = await req.json();
      
      console.log('Admin rejecting withdrawal:', withdrawalId);

      // Check if user is admin
      const { data: roleData } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        throw new Error('Unauthorized - Admin access required');
      }

      // Get withdrawal details for refund
      const { data: withdrawal, error: fetchError } = await supabaseClient
        .from('withdrawals')
        .select('*')
        .eq('id', withdrawalId)
        .single();

      if (fetchError) throw fetchError;

      // Refund to user wallet
      const { data: balance } = await supabaseClient
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', withdrawal.user_id)
        .eq('coin_symbol', 'USDT')
        .maybeSingle();

      const currentBalance = balance?.balance || 0;
      const refundAmount = parseFloat(withdrawal.amount.toString()) + parseFloat(withdrawal.fee.toString());
      const newBalance = parseFloat(currentBalance.toString()) + refundAmount;

      await supabaseClient
        .from('wallet_balances')
        .upsert({
          user_id: withdrawal.user_id,
          coin_symbol: 'USDT',
          balance: newBalance,
        }, { onConflict: 'user_id,coin_symbol' });

      // Update withdrawal status
      await supabaseClient
        .from('withdrawals')
        .update({
          status: 'rejected',
          notes: `Rejected by admin: ${reason}`,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawalId);

      console.log('Withdrawal rejected and refunded');

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Withdrawal rejected and funds refunded',
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
