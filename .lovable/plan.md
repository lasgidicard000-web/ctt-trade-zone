# Real Admin Dashboard + Merchant Payments Page

## 1. Admin dashboard — one place for everything

The admin panel keeps its Coin Prices tab but gains a real overview and a Members tab.

**Overview (new default tab)**
- Top cards: total members, total wallet value held, active plans, pending card funding requests, pending live-trading withdrawals, pending withdrawals.
- Two action lists: card funding requests awaiting credit and live-trading withdrawals awaiting approval, each with approve/reject right there.

**Members (new tab)**
- Searchable table of every member: name, email, joined date, role.
- Per member: total balance in USD (all coin balances valued at current prices), card status (issued / active / frozen / none) with card balance, plan status (plan name, principal, daily ROI, days left, or "no active plan"), pending requests count.
- Click a member to open a drawer with their balances by coin, investments, deposits, withdrawals, card funding requests and card transactions.
- Quick actions in the drawer: adjust balance (existing tool), grant/revoke admin, jump to their card.

Existing Withdrawals, Deposits, Redemptions, Transactions and User Management tabs stay; Cards (issuing, PIN, funding) stays where it is and is linked from the overview.

## 2. Merchant payments page

New page at `/merchant-payments`, linked from the wallet and card sections.

- Header shows the CTT spend card: last 4, balance, remaining daily allowance, per-transaction limit, activation state.
- Grid of the eight merchants: Binance, Bybit, Amazon, Apple, Netflix, Steam, Uber, Booking.com — each with category and what the payment is for.
- Choosing a merchant opens a form: amount, optional reference/note (order number, account email), quick amount buttons.
- On submit the amount is validated against card balance, per-transaction limit and remaining daily limit, then held and the request is queued for review; the card balance reflects the hold immediately so it can't be double-spent.
- Below the grid: the member's own request history with status (pending, approved, declined) and any admin note.
- Blocked with a clear message when no card exists, the card isn't activated, or it's frozen/terminated.

Admins see and act on these requests in the new admin overview: approve (charge lands as a card transaction), decline (hold released back to the card balance) with a note.

## Technical notes

- New table `merchant_payment_requests` (user_id, card_id, merchant, category, amount_usd, reference, status, admin_note, timestamps) with RLS: owners insert/read their own, admins read/update all; grants for `authenticated` and `service_role`.
- New security-definer functions: `merchant_request_payment(...)` (validates activation, balance, per-tx and daily limits, holds funds by debiting `virtual_cards.balance_usd`, writes a pending row + card security event) and `admin_decide_merchant_payment(_id, _approve, _note)` (approve → insert `card_transactions` row; decline → refund the hold), both audited to `admin_transaction_log`.
- `src/pages/MerchantPayments.tsx` plus `src/components/card/MerchantRequestDialog.tsx` and `MerchantRequestHistory.tsx`, reusing `useVirtualCard`. Existing `SpendCardMerchants` tile block links here instead of duplicating the flow.
- Admin side: `src/components/admin/AdminOverview.tsx` and `src/components/admin/AdminMembers.tsx` (+ `AdminMemberDrawer.tsx`), fed by the existing `admin-list-users` edge function extended to return balances, plan and card summaries in one call so the table doesn't fan out per user. New tabs wired into `src/pages/Admin.tsx`; route added in `src/App.tsx`.
