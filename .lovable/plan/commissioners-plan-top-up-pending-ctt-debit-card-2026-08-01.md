# Commissioners Plan Top-Up + Pending CTT Debit Card

Two new blocks at the very top of the Wallet Dashboard, above the Total Portfolio card. Both are frontend-only (no schema or balance changes).

## 1. Top-Up banner (first thing on the dashboard)

Shown to any user who does not have an active Commissioners Plan (Jeremy currently has none, so he sees it).

- Headline: activate the Commissioners Plan on your CTTTRADEZONE wallet dashboard.
- Shows required principal ($5,000 min, from the existing Commissioners plan template), the user's current available portfolio, and the exact shortfall to top up.
- Primary button "Top Up Now" opens the existing Add Funds dialog (BTC address + QR).
- Secondary button "Activate Commissioners Plan" opens the existing Purchase Plan dialog preselected to Commissioners.
- Once a Commissioners investment is active, the banner is replaced by a short "Commissioners Plan active" confirmation.

## 2. Pending CTT Debit Card

A crypto-card style visual placed directly under the top-up banner:

- Dark gradient card in the site's indigo/navy palette, CTT TRADE ZONE logo, chip and contactless glyphs, holder name from the profile display name, masked number (•••• •••• •••• 0000) while pending.
- Front of card shows the live Total Portfolio Value (same figure as the portfolio card, including the ticking ROI profit) as the card balance.
- Status badge:
  - No active Commissioners Plan: "AWAITING ACTIVATION" with the note that the card is issued once the Commissioners Plan is activated within 24 hours.
  - Commissioners Plan active: "PENDING — ACTIVATING" with a countdown of the remaining time in the 24-hour issuance window (from the plan's start time).
- Card is visual/pending only; no spending actions.

## Technical notes

- New components `src/components/CommissionersTopUpBanner.tsx` and `src/components/CttDebitCard.tsx`.
- `src/pages/Wallet.tsx` renders both above the Total Portfolio card, passing existing state: `totalPortfolioValue`, `walletUsd`, `activeInvestments`, `setAddFundsDialogOpen`, `setPurchasePlanOpen`, and the Commissioners template row fetched from `plan_templates`.
- Colors use existing semantic tokens; no hardcoded color utilities.
