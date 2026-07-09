import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("missing authorization");

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) throw new Error("not authenticated");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("admin role required");

    const { data: logs, error: logsErr } = await admin
      .from("roi_regulation_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (logsErr) throw logsErr;

    const adminIds = Array.from(new Set((logs ?? []).map((l: any) => l.admin_user_id).filter(Boolean)));
    const emailMap: Record<string, string> = {};
    for (const id of adminIds) {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) emailMap[id] = data.user.email;
    }

    const enriched = (logs ?? []).map((l: any) => ({
      ...l,
      admin_email: emailMap[l.admin_user_id] ?? null,
    }));

    return new Response(JSON.stringify({ logs: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-roi-audit error:", e);
    return new Response(
      JSON.stringify({ error: e.message ?? "unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
