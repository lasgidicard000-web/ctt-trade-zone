## Plan: Add Second Apple Gift Card Redemption (2/4 Approved)

### Overview

Record a second $500 AUD Apple gift card redemption and update the Gift Card Approval Tracker to dynamically show 2/4 segments approved, reflecting $500 USD approved toward the $1,000 USD target.

### Database Operations

**1. Insert Second Redemption Record**
Add another record to the `redemptions` table for Jeremy Element:

- Gift card type: Apple (itunes)
- Gift card currency: AUD
- Amount: $500
- Status: `approved`
- Crypto symbol: bitcoin symbol
- Timestamp: slightly after the first redemption with today's date and this exact time

**2. Insert Transaction Record**
Add a corresponding deposit transaction:

- Type: `deposit`
- Amount: 250 
- From: AUD to BTC
- Status: `completed`

### UI Component Update

Update `GiftCardApprovalTracker.tsx` to make the approved segments dynamic instead of hardcoded to 1:

- Change `approvedSegments` from hardcoded `1` to `redemptions.length` (counts all approved redemption records)
- Update the approved amount text from "$500 AUD / $250 USD" to "$1,000 AUD / $500 USD" reflecting both cards
- Update remaining from "$750 USD" to "$500 USD"
- The geometric 2x2 grid will now show 2 filled segments with checkmarks and 2 pending segments
- Progress ring will show 50% instead of 25%

### Visual Result

- 2x2 grid: top-left and top-right tiles filled with accent color and checkmarks; bottom tiles remain dashed/pending
- Progress ring: 50% filled
- Progress bar: 50% filled
- Badge: "2/4 Approved"
- Text: "$1,000 AUD / $500 USD approved" and "Remaining: $500 USD"

### Files Modified

1. `src/components/GiftCardApprovalTracker.tsx` -- make segments dynamic based on redemption count, update display values

### Technical Details

- Two SQL `INSERT` statements (redemptions + transactions)
- Component change: replace `const approvedSegments = 1` with `const approvedSegments = redemptions.length`
- Compute total amount across all redemptions: `redemptions.reduce((sum, r) => sum + (r.amount || 0), 0)`
- Hardcode updated USD equivalents for the 2/4 state ($500 USD approved, $500 USD remaining)