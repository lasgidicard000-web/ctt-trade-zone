import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  mode: z.enum(["delta", "multiply", "set"]),
  value: z.number().finite(),
  activeOnly: z.boolean(),
  propagateToActive: z.boolean(),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const token = authHeader.slice("Bearer ".length);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify JWT
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json(401, { error: "Invalid token" });
    }
    const userId = claimsData.claims.sub as string;

    // Service-role client for admin check + RPC
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) return json(500, { error: "Role check failed", detail: roleErr.message });
    if (!isAdmin) return json(403, { error: "Admin access required" });

    // Validate body
    let parsedBody;
    try {
      parsedBody = BodySchema.safeParse(await req.json());
    } catch {
      return json(400, { error: "Invalid JSON body" });
    }
    if (!parsedBody.success) {
      return json(400, { error: parsedBody.error.flatten().fieldErrors });
    }
    const { mode, value, activeOnly, propagateToActive } = parsedBody.data;

    // Atomic apply
    const { data, error } = await admin.rpc("regulate_daily_roi", {
      _admin_id: userId,
      _mode: mode,
      _value: value,
      _active_only: activeOnly,
      _propagate: propagateToActive,
    });

    if (error) {
      return json(400, { error: error.message });
    }

    return json(200, data);
  } catch (e) {
    return json(500, { error: (e as Error).message ?? "Unexpected error" });
  }
});
