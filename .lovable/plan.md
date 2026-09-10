# End-to-end walkthrough: Amazon merchant payment

A real run through the new merchant payments flow on card ••3734, from top-up to admin approval, with screenshots at each step.

## What will happen

1. **Put $1,000 on card ••3734.** A top-up request for $1,000 (USDT TRC20) is recorded for that member and approved from the admin dashboard, exactly the way a real deposit is confirmed. The card balance becomes $1,000 and the card is marked activated. This money stays on the card.
2. **Submit an Amazon request for $400.** Signed in as that member on the Merchant payments page: pick Amazon, enter $400, add a reference, submit. The page should immediately show $400 held, $600 available, and the request listed as pending.
3. **Confirm it reaches the admin dashboard.** Open the admin Overview tab and check the Merchant payments queue shows the member, Amazon, $400, pending.
4. **Approve it.** Approve from that queue and confirm:
   - the request flips to approved,
   - the $400 leaves the card for good (balance $600, no longer "held"),
   - an Amazon card transaction appears in the card history,
   - the member's Merchant payments page reflects the same after refresh.
5. **Report the numbers before and after** so the deduction is visible: $1,000 → $400 held → $600 final.

## Evidence collected

- Screenshots of the merchant page before submitting, right after submitting, the admin queue with the pending request, and the card balance after approval.
- The matching database rows for the top-up, the request, the card balance and the Amazon card transaction, so the on-screen figures and the stored figures are shown to agree.

## If something breaks

Any mismatch found along the way (wrong balance, request not visible to admin, approval not creating the transaction) gets fixed in the same pass and the affected step is re-run, so the walkthrough ends on a clean run.

## Technical notes

- Activation: insert a `card_funding_requests` row for user `078e6ca9-4150-4dba-9b98-04c56cd3939c` / card ••3734, then approve it through `admin_credit_card_funding` from the admin UI, which credits `virtual_cards.balance_usd` and sets `activated_at`.
- Member step drives `/merchant-payments` in a real browser session (Playwright against the local dev server, authenticated as that member), calling `merchant_request_payment`.
- Admin step uses the Overview queue in `src/components/admin/AdminOverview.tsx`, calling `admin_decide_merchant_payment`.
- Verification queries: `merchant_payment_requests`, `virtual_cards.balance_usd`, `card_transactions`, `card_security_events`.
