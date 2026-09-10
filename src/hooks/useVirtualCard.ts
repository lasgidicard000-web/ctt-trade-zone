import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VirtualCard {
  id: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  status: string;
  network: string;
  daily_limit: number;
  per_tx_limit: number;
  has_pin: boolean;
  issued_at: string;
  spent_today: number;
  spent_total: number;
  balance_usd: number;
  deposit_address: string | null;
  activation_required_usd: number;
  activated_at: string | null;
  credited_usd: number;
  billing_street: string | null;
  billing_suburb: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
}

export interface CardTransaction {
  id: string;
  merchant: string;
  amount_usd: number;
  amount_btc: number;
  btc_rate: number;
  status: string;
  decline_reason: string | null;
  created_at: string;
}

export interface CardFundingRequest {
  id: string;
  amount_usd: number;
  coin_symbol: string;
  network: string;
  deposit_address: string;
  tx_hash: string | null;
  status: string;
  admin_note: string | null;
  credited_at: string | null;
  created_at: string;
}

export interface MerchantPaymentRequest {
  id: string;
  merchant: string;
  category: string;
  amount_usd: number;
  reference: string | null;
  status: string;
  admin_note: string | null;
  decided_at: string | null;
  created_at: string;
}

export function useVirtualCard(userId?: string | null) {
  const [card, setCard] = useState<VirtualCard | null>(null);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [fundingRequests, setFundingRequests] = useState<CardFundingRequest[]>([]);
  const [merchantRequests, setMerchantRequests] = useState<MerchantPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [issueError, setIssueError] = useState<string | null>(null);

  const loadTransactions = useCallback(async (cardId: string) => {
    const { data } = await supabase
      .from("card_transactions")
      .select("id, merchant, amount_usd, amount_btc, btc_rate, status, decline_reason, created_at")
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(50);
    setTransactions(
      (data ?? []).map((t) => ({
        ...t,
        amount_usd: Number(t.amount_usd),
        amount_btc: Number(t.amount_btc),
        btc_rate: Number(t.btc_rate),
      })) as CardTransaction[]
    );
  }, []);

  const loadFunding = useCallback(async (cardId: string) => {
    const { data } = await supabase
      .from("card_funding_requests")
      .select(
        "id, amount_usd, coin_symbol, network, deposit_address, tx_hash, status, admin_note, credited_at, created_at"
      )
      .eq("card_id", cardId)
      .order("created_at", { ascending: false })
      .limit(50);
    setFundingRequests(
      (data ?? []).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) })) as CardFundingRequest[]
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCard(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc("get_my_card");
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      const c: VirtualCard = {
        ...(row as any),
        daily_limit: Number((row as any).daily_limit),
        per_tx_limit: Number((row as any).per_tx_limit),
        spent_today: Number((row as any).spent_today ?? 0),
        spent_total: Number((row as any).spent_total ?? 0),
        balance_usd: Number((row as any).balance_usd ?? 0),
        activation_required_usd: Number((row as any).activation_required_usd ?? 1000),
        credited_usd: Number((row as any).credited_usd ?? 0),
      };
      setCard(c);
      await Promise.all([loadTransactions(c.id), loadFunding(c.id)]);
    } else {
      setCard(null);
      setTransactions([]);
      setFundingRequests([]);
    }
    setLoading(false);
  }, [userId, loadTransactions, loadFunding]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-issue when the user became eligible (active Commissioners plan + 24h elapsed)
  const issue = useCallback(async () => {
    setIssueError(null);
    const { error } = await supabase.rpc("issue_virtual_card");
    if (error) {
      setIssueError(error.message);
      return false;
    }
    await refresh();
    return true;
  }, [refresh]);

  useEffect(() => {
    if (!loading && !card && userId) {
      // silent attempt; fails harmlessly when not yet eligible
      supabase.rpc("issue_virtual_card").then(({ error }) => {
        if (!error) refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, card, userId]);

  const setStatus = useCallback(
    async (status: "active" | "frozen" | "terminated") => {
      if (!card) return { error: "No card" };
      const { error } = await supabase.rpc("set_card_status", {
        _card_id: card.id,
        _status: status,
      });
      if (error) return { error: error.message };
      await refresh();
      return {};
    },
    [card, refresh]
  );

  const setPin = useCallback(
    async (pin: string) => {
      if (!card) return { error: "No card" };
      const { error } = await supabase.rpc("set_card_pin", { _card_id: card.id, _pin: pin });
      if (error) return { error: error.message };
      await refresh();
      return {};
    },
    [card, refresh]
  );

  const spend = useCallback(
    async (merchant: string, amountUsd: number) => {
      if (!card) return { error: "No card" };
      const { data, error } = await supabase.rpc("card_spend", {
        _card_id: card.id,
        _merchant: merchant,
        _amount_usd: amountUsd,
      });
      if (error) return { error: error.message };
      await refresh();
      return { result: data as any };
    },
    [card, refresh]
  );

  const requestFunding = useCallback(
    async (amountUsd: number, txHash?: string) => {
      if (!card) return { error: "No card" };
      const { error } = await supabase.rpc("card_request_funding", {
        _card_id: card.id,
        _amount_usd: amountUsd,
        _tx_hash: txHash?.trim() || null,
      });
      if (error) return { error: error.message };
      await refresh();
      return {};
    },
    [card, refresh]
  );

  const reveal = useCallback(
    async (pin: string) => {
      if (!card) return { error: "No card", code: "no_card" as const };
      const { data, error } = await supabase.rpc("get_card_details", {
        _card_id: card.id,
        _pin: pin,
      });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("no_pin")) return { error: "Set a card PIN first", code: "no_pin" as const };
        if (msg.includes("invalid_pin"))
          return { error: "Incorrect PIN", code: "invalid_pin" as const };
        const locked = msg.match(/locked_until:([^\s"]+)/);
        if (locked)
          return {
            error: "Too many incorrect attempts. Try again later.",
            code: "locked" as const,
            lockedUntil: locked[1],
          };
        return { error: msg, code: "unknown" as const };
      }
      return { details: data as any };
    },
    [card]
  );

  const logEvent = useCallback(
    async (action: string, success = true, detail?: string) => {
      if (!card) return;
      await supabase.rpc("log_card_event", {
        _card_id: card.id,
        _action: action,
        _success: success,
        _detail: detail ?? null,
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
    },
    [card]
  );

  return {
    card,
    transactions,
    fundingRequests,
    loading,
    issueError,
    issue,
    setStatus,
    setPin,
    spend,
    requestFunding,
    reveal,
    logEvent,
    refresh,
  };
}
