# Card to bank withdrawal (simulated)

Add a bank withdrawal flow to the card section, with Jeremy's demo bank details pre-filled so the button shows a real-looking setup.

Note: no members file arrived with the request, and the admin Overview and Merchant Payments queues already read the live accounts in your database (16 members, 3 merchant requests) rather than demo data. Nothing to import, so that part is left as-is. Re-attach the file any time and I'll load it.

## What gets built

1. **WITHDRAW FROM CARD TO BANK ACCOUNT button** in the card section, next to the existing spend and convert actions.
2. **Bank account setup form** (dialog): account holder name, bank name, account number, optional branch/BSB code. Clearly labelled as a simulated transfer for demonstration. No real banking credentials are collected or sent anywhere.
3. **Minimum amount $20,000.** If the card balance is lower, the form is blocked and shows:
   "Your demo balance is below the minimum withdrawal amount. You can continue by using the simulated options below."
   with three shortcuts:
   - Convert plan profits to USDT spend card (opens the existing convert dialog)
   - Wait for plan cycle to complete (links to the plans page)
   - Explore demo trading (links to the demo trading page)
4. **Risk notices** on the withdrawal and demo trading areas:
   - "TRADING INVOLVES RISK. THERE IS NO GUARANTEE OF PROFIT OR SUCCESS. THIS FEATURE IS A SIMULATION FOR DEMONSTRATION PURPOSES ONLY."
   - Banner: "IMPORTANT: CONTACT YOUR SPONSOR OR DEMO SUPPORT TO LEARN HOW THE SIMULATED TRADING FEATURE WORKS."
5. **Saved bank details** show as a read-only summary once set, with an Edit action and the account number masked except the last 4 digits.
6. **Withdrawal history** rows appear in the card transactions list and the wallet, with Pending review / Paid / Declined status, reviewed from the admin panel.
7. **Seed Jeremy's demo details** — since no details were supplied, placeholders are used: holder "Jeremy Element", bank "Demo Bank", account "•••• 1918", state Queensland (matching his existing billing address). Tell me the real demo values and I'll swap them in.

## Admin side

A "Bank Withdrawals" queue is added to the admin Overview alongside card funding and merchant requests, with Approve / Decline and an optional note. Approving marks the request paid and debits the held card balance; declining refunds the hold.

## Technical notes

- New table `card_bank_accounts` (user_id, card_id, holder_name, bank_name, account_number_last4, account_number_masked, branch_code, created/updated) with RLS: owners read/write their own row, admins read all. GRANTs for `authenticated` and `service_role`.
- New table `card_bank_withdrawals` (user_id, card_id, bank_account_id, amount_usd, status, admin_note, decided_at) with RLS owner-read / admin-read.
- RPC `card_request_bank_withdrawal(_card_id, _amount_usd)` — security definer, `authenticated` only: verifies card ownership, active + activated status, `_amount_usd >= 20000`, sufficient available balance (balance minus existing holds), inserts a pending withdrawal, records a `transactions` row and a `card_security_events` entry.
- RPC `admin_decide_bank_withdrawal(_withdrawal_id, _approve, _note)` — admin-only via `has_role`: on approve debits `virtual_cards.balance_usd` and writes a `card_transactions` row; on decline releases the hold.
- New components: `src/components/card/BankWithdrawalDialog.tsx`, `src/components/card/BankAccountForm.tsx`, `src/components/admin/AdminBankWithdrawals.tsx`.
- `useVirtualCard` gains `bankAccount`, `bankWithdrawals`, `saveBankAccount`, `requestBankWithdrawal`.
- Rendered in `src/components/CttDebitCard.tsx` (so it appears in both Wallet and the General dashboard) and surfaced in `src/pages/Admin.tsx` Overview.
- Jeremy's demo bank row is inserted with a data statement against his user id after the tables exist.

All balances, conversions and withdrawals in this flow are simulated records inside the app — no real money or cryptocurrency moves.
