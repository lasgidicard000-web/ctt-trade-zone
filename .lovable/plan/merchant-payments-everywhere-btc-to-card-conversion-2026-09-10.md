# Merchant payments everywhere + BTC-to-card conversion

## 1. Merchant payments row in the wallet

A new "Merchant payments" panel on the wallet page, sitting with the other money movements:

- Each request is listed like a withdrawal: merchant name, amount, date, reference, and a status pill (Pending review, Paid, Declined) plus any admin note.
- A small summary line on top: total paid this month, amount currently held pending, and remaining card balance.
- Empty state links to the merchant payments page.
- "View all" opens the full history on the merchant payments page.

## 2. Merchant payments tile in the card section

Inside the CTT card section (next to funding and transactions):

- A tile showing card balance, remaining daily allowance and pending holds.
- Merchant shortcuts (Binance, Bybit, Amazon, Apple, Netflix, Steam, Uber, Booking.com) that open the submit form for that merchant right there — no admin involvement, the member submits their own request.
- Latest three requests with status, and a link to the full page.
- When there is no card, or it is not activated / frozen, the tile explains why and hides the form.

## 3. Merchant payments as its own page

The page already exists at `/merchant-payments`; it gets:

- A link in the main navigation (under the card/wallet area) so it is reachable without going through the wallet.
- Proper page title and description for the subpage.
- The submit form, the eight merchants, and full request history with filters (All / Pending / Paid / Declined) — the member sees the hold applied to the card balance immediately and the balance drop confirmed once an admin approves.

## 4. "Convert your BTC from your plans to USDT and send to your card" button

Placed on the card section and on the merchant payments page.

- **Active card (activation deposit completed):** button is live. It opens a dialog where the member picks the source — a running plan (cashed out first, capital + profit) or their available BTC balance — enters an amount, sees the live BTC rate and the resulting USDT credited to the card, then confirms. The card balance goes up immediately and the movement shows in the wallet and transaction history.
- **Inactive / no card:** the button is disabled and reads "Available when card becomes active", with a short note about the $1,000 USDT activation deposit.

## Technical notes

- New security-definer RPC `card_convert_btc_to_usdt(_card_id, _amount_usd, _investment_id default null)`: verifies card ownership + `status = 'active'` and `activated_at is not null`; when `_investment_id` is given it first runs `withdraw_investment_to_portfolio` so the plan settles into the BTC wallet balance; then debits `wallet_balances` BTC at the current `coin_prices` BTC rate, credits `virtual_cards.balance_usd`, and writes a `card_funding_requests` row (status `credited`, coin `BTC`) plus a `transactions` row (`type = 'card_funding'`) and a `card_security_events` entry. Fails with a clear reason on insufficient balance or inactive card. Grants: `authenticated`, `service_role`.
- `useVirtualCard` gains `convertBtcToCard(amountUsd, investmentId?)` and exposes pending merchant hold totals.
- New components: `src/components/wallet/MerchantPaymentsRow.tsx`, `src/components/card/CardMerchantTile.tsx`, `src/components/card/ConvertBtcToCardDialog.tsx`; the merchant submit form is extracted from `MerchantPayments.tsx` into `src/components/card/MerchantRequestForm.tsx` so page, tile and wallet reuse one implementation.
- `src/pages/Wallet.tsx` renders the new row; `src/components/CttDebitCard.tsx` renders the tile and convert button; `src/components/Navbar.tsx` gets the `/merchant-payments` link.
