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

    const { category, timeframe } = await req.json();

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    if (timeframe === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let leaderboard: Array<{ display_name: string; value: number }> = [];

    if (category === 'portfolio') {
      // Get all users with their wallet balances
      const { data: balances } = await supabase
        .from('wallet_balances')
        .select('user_id, coin_symbol, balance');

      if (!balances) {
        throw new Error('Failed to fetch balances');
      }

      // Get coin prices
      const { data: prices } = await supabase
        .from('coin_prices')
        .select('symbol, price');

      if (!prices) {
        throw new Error('Failed to fetch prices');
      }

      const priceMap = new Map(prices.map(p => [p.symbol, parseFloat(p.price)]));

      // Calculate portfolio values
      const portfolioValues = new Map<string, number>();
      
      balances.forEach(balance => {
        const price = priceMap.get(balance.coin_symbol) || 0;
        const value = parseFloat(balance.balance) * price;
        const current = portfolioValues.get(balance.user_id) || 0;
        portfolioValues.set(balance.user_id, current + value);
      });

      // Get user profiles
      const userIds = Array.from(portfolioValues.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      leaderboard = Array.from(portfolioValues.entries())
        .map(([userId, value]) => ({
          display_name: profiles?.find(p => p.user_id === userId)?.display_name || 'Anonymous',
          value: value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    } else if (category === 'volume') {
      // Get trading volume for the timeframe
      const { data: transactions } = await supabase
        .from('transactions')
        .select('user_id, amount')
        .in('type', ['buy', 'sell'])
        .gte('created_at', startDate.toISOString());

      if (!transactions) {
        throw new Error('Failed to fetch transactions');
      }

      // Calculate volumes per user
      const volumeMap = new Map<string, number>();
      
      transactions.forEach(tx => {
        const current = volumeMap.get(tx.user_id) || 0;
        volumeMap.set(tx.user_id, current + parseFloat(tx.amount));
      });

      // Get user profiles
      const userIds = Array.from(volumeMap.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      leaderboard = Array.from(volumeMap.entries())
        .map(([userId, volume]) => ({
          display_name: profiles?.find(p => p.user_id === userId)?.display_name || 'Anonymous',
          value: volume,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    } else if (category === 'referrals') {
      // Get referral counts for the timeframe
      const { data: referrals } = await supabase
        .from('referrals')
        .select('referrer_id')
        .gte('created_at', startDate.toISOString());

      if (!referrals) {
        throw new Error('Failed to fetch referrals');
      }

      // Count referrals per user
      const referralCounts = new Map<string, number>();
      
      referrals.forEach(ref => {
        const current = referralCounts.get(ref.referrer_id) || 0;
        referralCounts.set(ref.referrer_id, current + 1);
      });

      // Get user profiles
      const userIds = Array.from(referralCounts.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      leaderboard = Array.from(referralCounts.entries())
        .map(([userId, count]) => ({
          user_id: userId,
          display_name: profiles?.find(p => p.user_id === userId)?.display_name || 'Anonymous',
          value: count,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    return new Response(JSON.stringify({ leaderboard }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in get-leaderboard function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
