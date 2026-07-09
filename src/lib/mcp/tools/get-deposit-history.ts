import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "get_deposit_history",
  title: "Get deposit history",
  description:
    "List the signed-in user's recent deposit records on CTTTradeZone, newest first.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .describe("Max number of deposits to return (1-100). Defaults to 25.")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const n = Math.max(1, Math.min(100, limit ?? 25));
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("deposit_history")
      .select(
        "id, coin_symbol, wallet_address, amount, transaction_hash, confirmation_status, confirmations, created_at, confirmed_at, notes",
      )
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(n);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { deposits: data ?? [] },
    };
  },
});
