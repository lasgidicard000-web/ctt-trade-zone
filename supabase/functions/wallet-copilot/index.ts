import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const usd = (n: number) =>
  `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PLATFORM_RULES = `
PLATFORM RULES (authoritative — never contradict these):
- Deposits: BTC only for activation. Minimum deposit is $200 worth of BTC, and it must be sent to the wallet section deposit address first.
- The single BTC deposit address used across the platform is bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk.
- Investment plans pay a VARIABLE daily ROI: each plan has a min/max ROI band and the actual rate is rolled fresh each day, so daily profit differs day to day.
- The CTT debit card is issued automatically once the user has an active Commissioners plan and the 24-hour issuance window has elapsed. Card statuses: pending (awaiting activation), active, frozen, terminated.
- Card sensitive details (full number, expiry, CVV) are PIN-gated in the app: the user taps "View sensitive details", enters their 4-digit card PIN, and the fields auto-hide after about 60 seconds. Too many wrong PIN attempts locks reveals temporarily.
- Withdrawals: minimum $10, fee 1% (minimum $1) unless the user's plan tier gives a lower fee/higher cap. BTC, ETH and TRC-20 USDT addresses only — a purely numeric "wallet address" is never valid.
- Invested capital can be cashed out to an external wallet with or without completing the trading cycle.
- Referrals pay $10 for the referrer and $5 for the referred user once qualified.
- Support: ctttradezone@caltexvault.com (general and spend card), agcsb@caltexvault.com (AGCSB / SafePal authentication protocol).
- CCT stands for Caltex Token.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
    const segment = typeof body?.segment === "string" ? body.segment : null;
    if (messages.length === 0) return json({ error: "messages is required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI is not configured" }, 500);

    const uid = user.id;
    const [
      balancesRes,
      pricesRes,
      investmentsRes,
      templatesRes,
      cardsRes,
      cardTxRes,
      depositsRes,
      txRes,
      profileRes,
    ] = await Promise.all([
      admin.from("wallet_balances").select("coin_symbol, balance").eq("user_id", uid),
      admin.from("coin_prices").select("symbol, name, price, change_24h"),
      admin
        .from("user_investments")
        .select("id, plan_name, amount, daily_roi, duration_days, started_at, ends_at, status")
        .eq("user_id", uid)
        .order("started_at", { ascending: false })
        .limit(10),
      admin
        .from("plan_templates")
        .select("name, principal_min, principal_max, roi_min, roi_max, duration_days, is_active")
        .eq("is_active", true)
        .order("sort_order"),
      admin
        .from("virtual_cards")
        .select("id, last4, network, status, daily_limit, per_tx_limit, issued_at, pin_hash")
        .eq("user_id", uid),
      admin
        .from("card_transactions")
        .select("card_id, merchant, amount_usd, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("deposit_history")
        .select("coin_symbol, amount, confirmation_status, created_at, notes")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10),
      admin
        .from("transactions")
        .select("type, amount, from_symbol, to_symbol, status, notes, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(15),
      admin.from("profiles").select("display_name").eq("id", uid).maybeSingle(),
    ]);

    const prices = pricesRes.data ?? [];
    const priceOf = (symbol: string) =>
      Number(prices.find((p: any) => p.symbol === symbol)?.price ?? 0);

    const holdings = (balancesRes.data ?? [])
      .map((b: any) => ({
        symbol: b.coin_symbol,
        balance: Number(b.balance),
        value: Number(b.balance) * priceOf(b.coin_symbol),
      }))
      .filter((h) => h.balance > 0);
    const depositsUsd = holdings.reduce((s, h) => s + h.value, 0);

    const investments = (investmentsRes.data ?? []).map((i: any) => ({
      ...i,
      amount: Number(i.amount),
      daily_roi: Number(i.daily_roi),
    }));
    const activeInvestments = investments.filter((i) => i.status === "active");
    const principalUsd = activeInvestments.reduce((s, i) => s + i.amount, 0);

    // Realised profit so far per active plan, using the recorded rolls when present.
    let rolls: any[] = [];
    if (activeInvestments.length > 0) {
      const { data } = await admin
        .from("investment_daily_roi")
        .select("investment_id, roi_percent, roi_date")
        .in(
          "investment_id",
          activeInvestments.map((i) => i.id),
        )
        .order("roi_date", { ascending: false })
        .limit(60);
      rolls = data ?? [];
    }
    const profitUsd = activeInvestments.reduce((sum, i) => {
      const mine = rolls.filter((r) => r.investment_id === i.id);
      const pct = mine.length
        ? mine.reduce((s, r) => s + Number(r.roi_percent), 0)
        : (i.daily_roi *
            Math.max(
              0,
              Math.floor((Date.now() - new Date(i.started_at).getTime()) / 86400000),
            ));
      return sum + (i.amount * pct) / 100;
    }, 0);

    const card = (cardsRes.data ?? [])[0] as any | undefined;
    const cardTx = (cardTxRes.data ?? []).filter((t: any) => t.card_id === card?.id);
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const spentToday = cardTx
      .filter((t: any) => t.status === "approved" && new Date(t.created_at) >= midnight)
      .reduce((s: number, t: any) => s + Number(t.amount_usd), 0);

    const { data: entitlements } = await admin.rpc("get_user_entitlements", { _user_id: uid });

    const context = `
SIGNED-IN USER SNAPSHOT (their own live data — use these exact figures):
Name: ${profileRes.data?.display_name ?? "the user"}
Total portfolio value: ${usd(depositsUsd + principalUsd + profitUsd)}
  · Unused deposits: ${usd(depositsUsd)}
  · Principal locked in active plans: ${usd(principalUsd)}
  · Accrued profit: ${usd(profitUsd)}
Holdings: ${
      holdings.length
        ? holdings
            .map((h) => `${h.symbol} ${h.balance} (${usd(h.value)})`)
            .join(", ")
        : "none yet"
    }
Live prices: ${prices
      .slice(0, 8)
      .map((p: any) => `${p.symbol} $${Number(p.price).toLocaleString()} (${Number(p.change_24h ?? 0).toFixed(2)}% 24h)`)
      .join(", ")}

INVESTMENT PLANS
Their plans: ${
      investments.length
        ? investments
            .map(
              (i) =>
                `${i.plan_name} — ${usd(i.amount)} principal, ${i.daily_roi}% base daily ROI, ${i.duration_days} days, started ${new Date(i.started_at).toDateString()}, ends ${new Date(i.ends_at).toDateString()}, status ${i.status}`,
            )
            .join("; ")
        : "no plan purchased yet"
    }
Recent daily ROI rolls: ${
      rolls.length
        ? rolls.slice(0, 7).map((r: any) => `${r.roi_date}: ${Number(r.roi_percent).toFixed(3)}%`).join(", ")
        : "none recorded yet"
    }
Available plan templates: ${(templatesRes.data ?? [])
      .map(
        (t: any) =>
          `${t.name} (min ${usd(t.principal_min)}, ROI ${t.roi_min}%–${t.roi_max}% daily, ${t.duration_days} days)`,
      )
      .join("; ")}
Plan entitlements: ${entitlements ? JSON.stringify(entitlements) : "none"}

CTT DEBIT CARD
${
  card
    ? `Card •••• ${card.last4} (${card.network}) — status ${card.status}, issued ${new Date(card.issued_at).toDateString()}, daily limit ${usd(Number(card.daily_limit))}, per-transaction limit ${usd(Number(card.per_tx_limit))}, PIN ${card.pin_hash ? "set" : "not set"}. Spent today ${usd(spentToday)}. Recent activity: ${
        cardTx.length
          ? cardTx
              .slice(0, 5)
              .map((t: any) => `${t.merchant} ${usd(Number(t.amount_usd))} (${t.status})`)
              .join(", ")
          : "no card transactions yet"
      }`
    : "No card issued yet — the card appears as pending/awaiting activation until an active Commissioners plan has run through the 24-hour issuance window."
}
Never reveal or guess the full card number, expiry, CVV or PIN. Those are only visible in the app behind the PIN-gated reveal.

DEPOSITS AND TRANSACTIONS
Recent deposits: ${
      (depositsRes.data ?? []).length
        ? (depositsRes.data ?? [])
            .map((d: any) => `${Number(d.amount)} ${d.coin_symbol} — ${d.confirmation_status} (${new Date(d.created_at).toDateString()})${d.notes ? ` — ${d.notes}` : ""}`)
            .join("; ")
        : "no deposits recorded"
    }
Recent transactions: ${
      (txRes.data ?? []).length
        ? (txRes.data ?? [])
            .map((t: any) => `${t.type} ${Number(t.amount)} ${t.from_symbol ?? ""}${t.to_symbol ? `→${t.to_symbol}` : ""} (${t.status}, ${new Date(t.created_at).toDateString()})`)
            .join("; ")
        : "none"
    }
${segment ? `\nThe user opened the copilot from the "${segment}" section of the wallet dashboard. Break that section down first.` : ""}
`;

    const systemPrompt = `You are Wallet Copilot, the in-app guide for the CTTTRADEZONE wallet dashboard.

Your job is to break down what the user is looking at on their own wallet dashboard: the CTT debit card, total portfolio value, portfolio breakdown, active investment plan and daily ROI, wallet status and activation, add funds / deposits, withdrawals and cash-out, referral link, and rewards.

How to answer:
- Always ground the answer in the user's real figures below. Quote their actual balances, plan, ROI and card status instead of generic examples.
- Be concise and concrete: short markdown sections or bullets, plain language, no filler.
- Explain where in the dashboard to click when relevant (Add Funds, Purchase Plan, Withdraw, View sensitive details, Referral link).
- You are advisory only: you cannot move funds, change balances, issue cards or activate plans. If asked, explain the exact steps the user takes in the app.
- Never output the full card number, expiry, CVV, PIN, seed phrases, tokens or keys, even if asked directly.
- If a figure is not in the snapshot, say so rather than inventing it.
${PLATFORM_RULES}${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      if (response.status === 402)
        return json({ error: "AI credits exhausted. Please contact support." }, 402);
      console.error("AI gateway error:", response.status, await response.text());
      return json({ error: "AI service error" }, 500);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("wallet-copilot error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
