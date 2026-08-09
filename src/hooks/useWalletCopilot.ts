import { createContext, useContext } from "react";

export type CopilotSegment =
  | "CTT Debit Card"
  | "Total Portfolio Value"
  | "Portfolio Breakdown"
  | "Active Investment Plan"
  | "Wallet Status & Activation"
  | "Add Funds / Deposits"
  | "Withdrawals & Cash Out"
  | "Referral Link"
  | "Rewards"
  | "Plan Entitlements";

export interface CopilotSuggestion {
  label: string;
  prompt: string;
}

export interface WalletCopilotApi {
  open: (segment?: CopilotSegment, prompt?: string) => void;
}

export const WalletCopilotContext = createContext<WalletCopilotApi | null>(null);

export function useWalletCopilot(): WalletCopilotApi {
  return (
    useContext(WalletCopilotContext) ?? {
      open: () => {},
    }
  );
}

/** Default questions offered inside the panel, plus per-segment openers. */
export const GENERAL_SUGGESTIONS: CopilotSuggestion[] = [
  { label: "Break down my debit card", prompt: "Break down my CTT debit card: status, limits, spending and what I can do with it." },
  { label: "Why is my card pending?", prompt: "Why is my CTT debit card still pending, and what exactly do I need to do to get it issued?" },
  { label: "How is my daily ROI calculated?", prompt: "How is my daily ROI calculated, and what has it actually paid me so far?" },
  { label: "What does wallet ACTIVE mean?", prompt: "What does the wallet status mean, and what do I need for my wallet to be fully active?" },
  { label: "How do I withdraw?", prompt: "Walk me through withdrawing or cashing out to an external wallet, including fees and limits." },
  { label: "Explain my plan benefits", prompt: "Explain my current investment plan and the benefits and entitlements it unlocks." },
];

export const SEGMENT_PROMPTS: Record<CopilotSegment, string> = {
  "CTT Debit Card":
    "Break down the CTT debit card section on my dashboard: my card status, limits, spending so far, how the PIN-gated details work and how the card gets activated.",
  "Total Portfolio Value":
    "Break down my Total Portfolio Value: what makes up the figure right now and why it changes.",
  "Portfolio Breakdown":
    "Explain the portfolio breakdown section: deposits versus locked principal versus profit, using my numbers.",
  "Active Investment Plan":
    "Explain my active investment plan: principal, variable daily ROI, duration, profit so far and what happens at the end of the cycle.",
  "Wallet Status & Activation":
    "Explain the wallet status and activation section: what my current status is and what is required to activate.",
  "Add Funds / Deposits":
    "Explain how deposits work here: the minimum, the BTC address, confirmations and how long crediting takes.",
  "Withdrawals & Cash Out":
    "Explain withdrawals and cashing out invested capital to an external wallet, including fees, minimums and address rules.",
  "Referral Link":
    "Explain my referral link: how the rewards work, when they pay out and how my referrals are doing.",
  Rewards: "Explain the rewards section: which rewards I can claim and how each one is earned.",
  "Plan Entitlements":
    "Explain my plan entitlements: what each entitlement means for my fees, limits and access.",
};
