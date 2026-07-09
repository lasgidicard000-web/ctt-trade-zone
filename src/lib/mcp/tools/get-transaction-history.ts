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
  name: "get_transaction_history",
  title: "Get transaction history",
  description:
    "List the signed-in user's recent transactions (deposits, trades, transfers) on CTTTradeZone, newest first.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .describe("Max number of transactions to return (1-200). Defaults to 50.")
      .optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const n = Math.max(1, Math.min(200, limit ?? 50));
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("transactions")
      .select("id, type, from_symbol, to_symbol, amount, status, created_at")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(n);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { transactions: data ?? [] },
    };
  },
});
