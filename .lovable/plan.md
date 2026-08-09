# Wallet Copilot

Add an AI copilot inside the wallet dashboard that can explain every segment of the wallet — the CTT debit card, portfolio, active investment plan, deposits, withdrawals, referrals — using the signed-in user's own live data.

## What the user sees

1. **Copilot launcher** — a floating "Wallet Copilot" button pinned bottom-right on `/wallet`, opening a slide-in panel (sheet on mobile, side panel on desktop) that sits over the dashboard without navigating away.
2. **Explain-this shortcuts** — a small "Explain" action on each wallet segment header (CTT debit card, Total Portfolio, Portfolio Breakdown, Active Investment, Wallet Status / activation, Add Funds, Withdraw, Referral link). Clicking one opens the copilot with that segment preselected so it breaks down exactly that block.
3. **Suggested questions** — chips inside the panel: "Break down my debit card", "Why is my card pending?", "How is my daily ROI calculated?", "What does wallet ACTIVE mean?", "How do I withdraw?", "Explain my plan benefits".
4. **Grounded answers** — replies reference the user's real figures (portfolio value, BTC balance, card status/limits/spend, plan principal and daily ROI, entitlement fees/caps, deposit address rules) rather than generic crypto advice, with streaming text and a copy button.

The panel keeps its conversation for the session and offers a Clear action. It is advisory only — no balance, card, or plan changes are made from the copilot.

## Technical notes

- New edge function `supabase/functions/wallet-copilot/index.ts`, modeled on the existing `crypto-chat` function (JWT verified server-side, Lovable AI Gateway, streamed SSE). It loads the caller's own `wallet_balances`, `coin_prices`, `user_investments` (+ `plan_templates`), latest `investment_daily_roi` rolls, `virtual_cards` masked fields (last4, status, limits, spend — never PAN/CVV/PIN), recent `deposits`/`transactions`, `plan_entitlements`, and referral stats, then composes a wallet-specific system prompt including the platform rules already used across the app ($200 BTC minimum to the wallet section, fixed BTC address, 24h card issuance window, withdrawal min/fee, PIN-gated card details).
- Sensitive values are excluded from the prompt: no full card number, CVV, expiry, PIN, tokens, or service keys.
- New `src/components/wallet/WalletCopilot.tsx` (panel + streaming client) and `src/components/wallet/ExplainButton.tsx`, plus a `src/hooks/useWalletCopilot.ts` holding messages, streaming state and the active segment.
- `src/pages/Wallet.tsx` mounts `<WalletCopilot />` once and drops `ExplainButton` into the existing segment headers; no changes to balances, RPCs, or existing card logic.
- Errors surfaced explicitly: 429 rate limit, 402 credits exhausted, network failure — each shown in the panel with the user's question preserved.
- Styling uses existing semantic tokens (indigo/navy palette); no hardcoded color utilities.
