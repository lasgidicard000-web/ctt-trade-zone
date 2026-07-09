import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getWalletBalances from "./tools/get-wallet-balances";
import getDepositHistory from "./tools/get-deposit-history";
import getTransactionHistory from "./tools/get-transaction-history";
import getCoinPrices from "./tools/get-coin-prices";

// Build the OAuth issuer from the Supabase project ref (Vite inlines this at
// build time). Never derive it from SUPABASE_URL — on Lovable Cloud that URL
// is the .lovable.cloud proxy, and mcp-js rejects any mismatched issuer.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ctttradezone-mcp",
  title: "CTTTradeZone",
  version: "0.1.0",
  instructions:
    "Tools for the signed-in CTTTradeZone user. Use these to read the user's crypto wallet balances, deposit history, transaction history, and current coin prices. All tools act as the signed-in user; all writes are still gated by row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getWalletBalances, getDepositHistory, getTransactionHistory, getCoinPrices],
});
