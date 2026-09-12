# Simulated Card-to-Bank Withdrawal + Demo Options

Everything below is a demonstration flow. No real money, crypto, or banking data moves; the bank form collects generic demo fields only and is clearly labelled as a simulation.

## 1. Main button in the card section

Add a prominent button to the CTT card area (card section and the merchant payments page):

**WITHDRAW FROM CARD TO BANK ACCOUNT**

Clicking it opens a new page, `/card-bank-withdrawal`.

## 2. Bank withdrawal page (simulated)

- Header states clearly this is a demo simulation, no real bank transfer occurs.
- Demo bank setup form: account holder name, bank name, account number (generic demo fields), plus withdrawal amount.
- Shows the current demo card balance.
- Minimum simulated withdrawal: **$20,000**.
- If the demo balance is under $20,000, the form is blocked and this message shows:

  "Your demo balance is below the minimum withdrawal amount. You can continue by using the simulated options below."

- Below the message, three demo option cards:
  - **CONVERT PLAN PROFITS TO USDT SPEND CARD** — opens the existing simulated BTC-to-card conversion dialog.
  - **WAIT FOR PLAN CYCLE TO COMPLETE** — shows the user's running plans and their remaining cycle time; informational only.
  - **EXPLORE DEMO TRADING** — links to the demo trading section.
- When the balance is at or above $20,000, submitting records a simulated withdrawal entry with a pending status and history, and the demo card balance is reduced in the demo ledger only.

## 3. Demo trading entry using the card balance as stake

On the demo trading section, add a "Stake from demo card balance" panel: pick a market, a simulated stake amount capped at the demo card balance, and a direction (up/down). The result is written to the existing demo trading ledger only.

Prominent warning shown on both the withdrawal page options and the demo trading panel:

**TRADING INVOLVES RISK. THERE IS NO GUARANTEE OF PROFIT OR SUCCESS. THIS FEATURE IS A SIMULATION FOR DEMONSTRATION PURPOSES ONLY.**

Banner at the top of the demo trading section:

**IMPORTANT: CONTACT YOUR SPONSOR OR DEMO SUPPORT TO LEARN HOW THE SIMULATED TRADING FEATURE WORKS.**

## Technical notes

- New page `src/pages/CardBankWithdrawal.tsx`, route added in `src/App.tsx`.
- New table `demo_bank_withdrawals` (holder name, bank name, masked account reference, amount, status, timestamps) with RLS scoped to `auth.uid()` and the required GRANTs. Account numbers are stored masked (last 4 only) since this is demo data.
- A `demo_bank_withdraw` RPC validates ownership, the $20,000 minimum and available demo card balance, debits `virtual_cards.balance_usd`, and inserts the simulated withdrawal record. No payment provider or crypto transfer is involved.
- Reuse `ConvertBtcToCardDialog`, `useVirtualCard`, and the existing `useDemoTrading` engine for the trading stake; no new pricing or settlement logic.
- The demo trading stake panel plugs into `src/pages/DemoTrading.tsx` and its existing demo order flow.
- Buttons added in `src/components/card/CardMerchantTile.tsx` (card section) and `src/pages/MerchantPayments.tsx`.
