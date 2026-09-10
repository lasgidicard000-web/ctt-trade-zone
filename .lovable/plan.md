# Real CTT spend card: own balance, limits and Tron deposit address

Today the card's activation panel is display-only: the progress bar reads the user's USDT wallet balance, and card purchases are debited from the BTC wallet balance. This makes the card a real product: it gets its own USD balance, its own funding flow through a Tron (TRC20) USDT deposit address, and limits enforced against that balance.

## What the user sees

**On the card section (wallet dashboard and General dashboard)**

- A **Card balance** figure on the card panel: available balance, plus "spent today / daily limit" and per-transaction limit.
- The **activation panel** becomes real: progress is measured by USDT actually credited to the card (not the wallet), so it only moves when a deposit is confirmed. Once $1,000 is credited, the card flips to active and the green confirmation appears.
- **Fund card** button: shows the card's own TRC20 deposit address with QR and copy, the amount field, and a "I have sent it" submission that records a pending funding request and copies the details into live chat (same pattern as existing deposits).
- **Card funding history**: each deposit with amount, network, status (pending / credited / rejected) and date.
- Purchases (merchant tiles and the spend dialog) now debit the **card balance**, and declines say "Insufficient card balance", "Exceeds daily limit" or "Exceeds per-transaction limit" as appropriate. Card is unusable until activation is complete.

**On the admin side**

- A **Card funding** panel in the admin cards area listing pending TRC20 funding requests, with Credit / Reject actions and an optional note. Crediting adds to the card balance, marks the request credited, logs it, and auto-activates the card once the $1,000 activation threshold is reached.

Deposits are credited by admin confirmation (matching how manual deposits already work in this app) — no automatic chain watching.

## Technical notes

**Schema (one migration)**

- `virtual_cards`: add `balance_usd numeric not null default 0`, `deposit_address text`, `activation_required_usd numeric not null default 1000`, `activated_at timestamptz`.
- New `card_funding_requests`: `user_id`, `card_id`, `amount_usd`, `coin_symbol` (default `USDT`), `network` (default `TRC20`), `deposit_address`, `tx_hash`, `status` (`pending`/`credited`/`rejected`), `admin_note`, `credited_at`, timestamps. GRANTs for `authenticated` (select/insert own) and `service_role`; RLS: users read and create their own, admins read all; updates only through security-definer functions.
- Functions:
  - `card_request_funding(_card_id, _amount_usd, _tx_hash)` — inserts a pending request for the caller's card, validated amount.
  - `admin_credit_card_funding(_request_id, _approve, _note)` — admin-only via `has_role`; on approve adds to `virtual_cards.balance_usd`, writes a `transactions` row, and sets `status='active'`/`activated_at` once total credited ≥ `activation_required_usd`.
  - `card_spend` rewritten: debit `balance_usd` instead of BTC wallet; block when `activated_at is null`; keep daily/per-tx checks and keep writing `card_transactions` (still storing a BTC equivalent for display).
  - `get_my_card` extended to return `balance_usd`, `deposit_address`, `activation_required_usd`, `activated_at`, `credited_usd`.
- Backfill: set `deposit_address` on existing cards to `TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L`.

**Frontend**

- `useVirtualCard`: extend `VirtualCard` with the new fields, add `fundingRequests` + `requestFunding()`.
- `CardActivationDeposit.tsx`: read progress from `credited_usd` / `activation_required_usd` and the card's `deposit_address`; add amount + optional tx-hash inputs calling `card_request_funding` before the clipboard/live-chat hand-off.
- New `src/components/card/CardFundingHistory.tsx` and a balance row in `CttDebitCard.tsx`.
- `CardSpendDialog` / `SpendCardMerchants`: gate on activation and check against card balance.
- New `src/components/admin/AdminCardFunding.tsx`, mounted in the existing admin cards area.
- Design tokens only, no hardcoded colours.
