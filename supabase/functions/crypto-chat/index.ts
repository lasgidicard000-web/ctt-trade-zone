import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { messages } = await req.json();
    
    // Get JWT from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's portfolio data
    const { data: walletBalances } = await supabaseClient
      .from('wallet_balances')
      .select('coin_symbol, balance')
      .eq('user_id', user.id);

    const { data: coinPrices } = await supabaseClient
      .from('coin_prices')
      .select('symbol, name, price, change_24h');

    // Build portfolio context
    let portfolioContext = '';
    if (walletBalances && walletBalances.length > 0 && coinPrices) {
      const portfolioData = walletBalances.map(balance => {
        const coin = coinPrices.find(c => c.symbol === balance.coin_symbol);
        if (coin) {
          const value = Number(balance.balance) * Number(coin.price);
          return {
            symbol: balance.coin_symbol,
            name: coin.name,
            balance: balance.balance,
            price: coin.price,
            change24h: coin.change_24h,
            value: value.toFixed(2)
          };
        }
        return null;
      }).filter((coin): coin is NonNullable<typeof coin> => coin !== null);

      const totalValue = portfolioData.reduce((sum, coin) => sum + Number(coin.value), 0);

      portfolioContext = `\n\nCURRENT USER PORTFOLIO:
Total Portfolio Value: $${totalValue.toFixed(2)}

Holdings:
${portfolioData.map(coin => 
  `- ${coin.name} (${coin.symbol}): ${coin.balance} coins @ $${coin.price} = $${coin.value} (24h change: ${coin.change24h}%)`
).join('\n')}

Use this portfolio data to provide personalized advice and analysis when relevant.`;
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Received chat request with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: `You are CryptoAdvisor, an AI assistant specialized in cryptocurrency and portfolio management. You provide helpful, accurate information about:
- Cryptocurrency basics and concepts
- Portfolio management strategies
- Market trends and analysis
- Risk management
- Trading strategies

Always be helpful, concise, and provide actionable advice. If you're unsure about something, admit it rather than speculating.${portfolioContext}`
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service quota exceeded. Please contact support." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
