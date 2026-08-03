# Activate the CTT Debit Card + Full Crypto Card Features

Jeremy's Commissioners Plan is active (started 03 Aug 2026, $1,322.99 principal), so his card is eligible for issuance. The card today is a visual placeholder only. This turns it into a real, working virtual crypto card for any user with an active Commissioners Plan (or higher), with Jeremy's card issued as ACTIVE right away.

## What the user sees

**Card front (activated state)**
- Status flips from "PENDING — ACTIVATING" to a green ACTIVE badge.
- Real issued card identity: masked number (•••• •••• •••• 4821 style), expiry MM/YY, holder name, network label (CTT Virtual Mastercard).
- Live spendable balance = current total portfolio value (deposits + accrued ROI), same figure as the portfolio card.
- "Reveal details" toggle shows full number, expiry and CVV for 30 seconds, then re-masks; a Copy button for the number.

**Card controls (below the card)**
- Freeze / Unfreeze — instantly blocks or resumes spending; frozen card renders dimmed with a FROZEN badge.
- Spend limits panel driven by the user's plan entitlements: daily spend cap (Commissioners: $75,000), per-transaction cap, and a progress bar of today's spend against the cap.
- Card PIN: set / change a 4-digit PIN (stored hashed, never returned to the client).
- Spend / Purchase action: enter merchant name + USD amount, validated against balance, freeze state, daily cap and per-transaction cap; on success it debits the wallet at the live BTC rate and records a card transaction.
- Card transactions list: merchant, amount, date, status (approved / declined with reason), newest first, with realtime updates.
- Terminate card (with confirm) for the user, and re-issue if terminated.

**Admin**
- New "Cards" tab in Admin Transactions: list every issued card with holder, status, today's spend, lifetime spend; actions to activate, freeze, unfreeze or terminate a card, plus view its transactions. Every action written to the existing admin audit log.

## Eligibility and issuance rules

- A card is issued only when the user has an active plan with Commissioners tier or higher (`has_active_plan`).
- Issuance happens automatically 24 hours after plan start; before that the card shows "PENDING — ACTIVATING" with the existing countdown. Users whose 24h window has already elapsed (Jeremy) get issued immediately on first load.
- Users with no qualifying plan keep the current "AWAITING ACTIVATION" state and the top-up banner.
- Spending is only from real wallet balance — no credit, no overdraft.

## Technical notes

Database migration (with GRANTs and RLS per table):
- `virtual_cards` — user_id, card_number_last4, card_number_encrypted, expiry_month, expiry_year, cvv_encrypted, pin_hash, status (`pending`|`active`|`frozen`|`terminated`), network, issued_at, daily_limit, per_tx_limit, unique active card per user. Users can read only their own card (never the encrypted columns via a restricted view/RPC), admins read all.
- `card_transactions` — card_id, user_id, merchant, amount_usd, amount_btc, btc_rate, status, decline_reason, created_at. Users read own, insert only via function.

Security-definer functions:
- `issue_virtual_card(_user_id)` — validates tier + 24h window, generates number/expiry/CVV server-side, returns only masked data.
- `card_spend(_card_id, _merchant, _amount_usd)` — atomic: checks status, PIN-free (PIN is for display parity), balance, daily and per-tx caps from `plan_entitlements`, debits `wallet_balances` BTC at the live `coin_prices` rate, inserts `card_transactions` and a `transactions` row.
- `set_card_pin`, `set_card_status` (user: freeze/unfreeze/terminate own card; admin: any card, audited).
- `get_card_details(_card_id)` — returns full PAN/CVV once, for the reveal action, only to the card owner.

Frontend:
- Rewrite `src/components/CttDebitCard.tsx` to consume the card record and render active/frozen/pending states; extract `CardControls`, `CardSpendDialog` and `CardTransactionsList` into `src/components/card/`.
- New `src/hooks/useVirtualCard.ts` for card state, realtime subscription and spend/freeze/PIN mutations.
- `src/pages/Wallet.tsx` keeps passing `userId` and `portfolioUsd`; no layout changes elsewhere.
- Admin tab added to `src/pages/AdminTransactions.tsx` using an extended `admin-transactions` edge function action set.
- All colors via existing semantic tokens.
