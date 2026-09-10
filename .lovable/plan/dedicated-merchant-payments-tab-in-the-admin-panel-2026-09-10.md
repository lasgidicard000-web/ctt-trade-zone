# Dedicated Merchant Payments tab in the admin panel

Merchant payment requests currently only appear inside the Overview tab's queue, mixed in with card funding and live-trading withdrawals — easy to miss. Give them their own tab.

## Changes

1. **New "Merchant Payments" tab in `src/pages/Admin.tsx`**
   - Add a `Merchant Payments` tab trigger between "Members" and "Coin Prices" (grid updated from 8 to 9 columns).
   - Full history table, not just pending: all requests with member, merchant, category, amount, reference, date, and status badge (Pending / Paid / Declined) plus the admin note.
   - Pending rows get the same Approve / Decline actions with optional note input as the Overview queue, calling `admin_decide_merchant_payment` (approve lands a card transaction; decline refunds the hold to the card).
   - Filter buttons: All / Pending / Paid / Declined, and a Refresh button.

2. **Reusable table component** — `src/components/admin/AdminMerchantPayments.tsx` holds the table + decision logic; Overview keeps its compact pending-only queue unchanged (deep-link hint not needed since the tab is now visible).

3. **Badge count**: the tab label shows the pending count (e.g. "Merchant Payments (2)") so new requests are visible from any tab.

## Technical notes

- Reads `merchant_payment_requests` via existing admin RLS (admins read/update all); decisions go through the existing `admin_decide_merchant_payment(_request_id, _approve, _note)` RPC — no database changes.
- Status mapping: `pending` → Pending, `approved` → Paid, `declined` → Declined badges.
- After each decision, the tab list and the Overview totals both refresh.
