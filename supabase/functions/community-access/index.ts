import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COMMUNITY_LINKS = {
  telegram: "https://t.me/+ctt_community_placeholder",
  whatsapp: "https://chat.whatsapp.com/ctt_community_placeholder",
  discord: "https://discord.gg/ctt_community_placeholder",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: ent, error } = await supabase.rpc("get_user_entitlements", { _user_id: user.id });
    if (error) throw error;

    if (!ent?.community_access) {
      return new Response(
        JSON.stringify({
          error: "Community access requires the Inspectors Plan or higher.",
          current_tier: ent?.plan_name ?? "None",
          required_tiers: ["Inspectors Plan", "Superintendent Plan", "Commissioners Plan", "General Plan"],
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        tier: ent.plan_name,
        links: COMMUNITY_LINKS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
