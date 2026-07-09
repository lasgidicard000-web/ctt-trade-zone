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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const user = userData?.user;

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, referralCode, milestoneId } = await req.json();

    if (action === 'claim-referral-reward') {
      console.log('Processing referral reward for user:', user.id);

      // Find the referral
      const { data: referral, error: referralError } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .eq('reward_claimed', false)
        .single();

      if (referralError || !referral) {
        throw new Error('No unclaimed referral found');
      }

      const rewardAmount = 10; // $10 USDT bonus for referrer

      // Update wallet balance
      const { data: existingBalance } = await supabase
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('coin_symbol', 'USDT')
        .single();

      if (existingBalance) {
        await supabase
          .from('wallet_balances')
          .update({ balance: parseFloat(existingBalance.balance) + rewardAmount })
          .eq('user_id', user.id)
          .eq('coin_symbol', 'USDT');
      } else {
        await supabase
          .from('wallet_balances')
          .insert({
            user_id: user.id,
            coin_symbol: 'USDT',
            balance: rewardAmount,
          });
      }

      // Mark referral as claimed
      await supabase
        .from('referrals')
        .update({ reward_claimed: true })
        .eq('id', referral.id);

      // Record reward
      await supabase
        .from('rewards_history')
        .insert({
          user_id: user.id,
          reward_type: 'referral_referrer',
          amount: rewardAmount,
          description: 'Referral bonus',
          reference_id: referral.id,
        });

      return new Response(JSON.stringify({ success: true, amount: rewardAmount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'apply-referral-code') {
      console.log('Applying referral code:', referralCode, 'for user:', user.id);

      // Check if user already used a referral code
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('*')
        .eq('referee_id', user.id)
        .maybeSingle();

      if (existingReferral) {
        throw new Error('You have already used a referral code');
      }

      // Find referrer by code (code format: USER_ID)
      const referrerId = referralCode;

      if (referrerId === user.id) {
        throw new Error('You cannot use your own referral code');
      }

      // Create referral record
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrerId,
          referee_id: user.id,
          referral_code: referralCode,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Invalid referral code');
      }

      // Give referee bonus
      const refereeBonus = 5; // $5 USDT bonus for new user

      const { data: existingBalance } = await supabase
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('coin_symbol', 'USDT')
        .single();

      if (existingBalance) {
        await supabase
          .from('wallet_balances')
          .update({ balance: parseFloat(existingBalance.balance) + refereeBonus })
          .eq('user_id', user.id)
          .eq('coin_symbol', 'USDT');
      } else {
        await supabase
          .from('wallet_balances')
          .insert({
            user_id: user.id,
            coin_symbol: 'USDT',
            balance: refereeBonus,
          });
      }

      // Record reward
      await supabase
        .from('rewards_history')
        .insert({
          user_id: user.id,
          reward_type: 'referral_referee',
          amount: refereeBonus,
          description: 'Welcome bonus for using referral code',
        });

      return new Response(JSON.stringify({ success: true, amount: refereeBonus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'claim-milestone-reward') {
      console.log('Claiming milestone reward:', milestoneId, 'for user:', user.id);

      // Get user milestone
      const { data: userMilestone, error: milestoneError } = await supabase
        .from('user_milestones')
        .select('*, milestones(*)')
        .eq('user_id', user.id)
        .eq('milestone_id', milestoneId)
        .eq('completed', true)
        .eq('reward_claimed', false)
        .single();

      if (milestoneError || !userMilestone) {
        throw new Error('Milestone not completed or already claimed');
      }

      const rewardAmount = parseFloat(userMilestone.milestones.reward_amount);

      // Update wallet balance
      const { data: existingBalance } = await supabase
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', user.id)
        .eq('coin_symbol', 'USDT')
        .single();

      if (existingBalance) {
        await supabase
          .from('wallet_balances')
          .update({ balance: parseFloat(existingBalance.balance) + rewardAmount })
          .eq('user_id', user.id)
          .eq('coin_symbol', 'USDT');
      } else {
        await supabase
          .from('wallet_balances')
          .insert({
            user_id: user.id,
            coin_symbol: 'USDT',
            balance: rewardAmount,
          });
      }

      // Mark milestone reward as claimed
      await supabase
        .from('user_milestones')
        .update({ reward_claimed: true })
        .eq('id', userMilestone.id);

      // Record reward
      await supabase
        .from('rewards_history')
        .insert({
          user_id: user.id,
          reward_type: 'milestone',
          amount: rewardAmount,
          description: `Milestone reward: ${userMilestone.milestones.name}`,
          reference_id: userMilestone.id,
        });

      return new Response(JSON.stringify({ success: true, amount: rewardAmount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-milestone-progress') {
      console.log('Updating milestone progress for user:', user.id);

      // Get all active milestones
      const { data: milestones } = await supabase
        .from('milestones')
        .select('*')
        .eq('is_active', true);

      if (!milestones) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      for (const milestone of milestones) {
        let currentProgress = 0;

        if (milestone.milestone_type === 'trade_count') {
          const { count } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('type', ['buy', 'sell']);
          
          currentProgress = count || 0;
        } else if (milestone.milestone_type === 'trade_volume') {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .in('type', ['buy', 'sell']);
          
          currentProgress = transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        } else if (milestone.milestone_type === 'deposit_amount') {
          const { data: deposits } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'deposit');
          
          currentProgress = deposits?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
        }

        const completed = currentProgress >= parseFloat(milestone.target_value);

        // Upsert user milestone
        await supabase
          .from('user_milestones')
          .upsert({
            user_id: user.id,
            milestone_id: milestone.id,
            current_progress: currentProgress,
            completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
          }, {
            onConflict: 'user_id,milestone_id'
          });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Error in process-rewards function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
