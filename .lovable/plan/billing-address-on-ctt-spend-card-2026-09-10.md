# Billing Address on CTT Spend Card

Add a billing address to Jeremy Element's virtual card and show it in the card section.

## Changes

1. **Database migration**
   - Add `billing_street`, `billing_city`, `billing_state`, `billing_zip`, `billing_country` (nullable text) to `virtual_cards`.
   - Extend `get_my_card()` (drop/recreate) to return the billing fields.
   - Seed Jeremy Element's card (user `b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5`) with:
     - Street: 04 Diamantina Court
     - City: Brisbane, Town/Suburb: Murrumba Downs (stored as suburb in street line or city context), State: Queensland, Zip: 4503, Country: Australia

2. **Frontend**
   - `src/hooks/useVirtualCard.ts`: expose the billing address fields on the card object.
   - `src/components/CttDebitCard.tsx`: new "Billing address" panel in the card section showing the formatted address with a one-click copy button (and copy logged to card security events like other card fields).
   - Show a friendly "No billing address on file" state for cards without one.

3. **Verify**: typecheck passes; address renders under Jeremy's card.

## Technical details
- Rendered address: `04 Diamantina Court, Murrumba Downs, Brisbane QLD 4503, Australia`.
- Suburb (Murrumba Downs) stored as a second street line; city = Brisbane, state = Queensland, zip = 4503.
- Read-only display this round; no editing UI unless requested.
