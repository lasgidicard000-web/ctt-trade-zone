

## Plan: Approve 3rd Segment of Gift Card Redemption (3/4)

### Overview
Insert a third approved redemption record for the same Apple gift card flow, and update the tracker UI to reflect 3/4 (75%) approval with $750 USD approved and $250 USD remaining.

### Database Operations

**1. Insert Third Redemption Record**
Add another approved record to `redemptions` for Jeremy Element (`user_id: a9292523-50fe-4d49-a262-8620811f075c`):
- Gift card type: itunes (Apple)
- Gift card currency: AUD
- Amount: 500
- Status: approved
- Crypto symbol: BTC
- Timestamp: current time (today's date)

**2. Insert Transaction Record**
Add a corresponding deposit transaction to `transactions`:
- Type: deposit
- Amount: 250
- From symbol: AUD
- To symbol: BTC
- Status: completed
- Same user_id

### UI Component Update

Update `GiftCardApprovalTracker.tsx` to reflect the new 3/4 state:
- Update the approved text from "$500 USD" to "$750 USD" (line 131 and 140)
- Update remaining from "$500 USD" to "$250 USD" (line 141)

### Visual Result
- 2x2 grid: 3 tiles filled with accent color and checkmarks, 1 pending tile
- Progress ring: 75% filled
- Progress bar: 75% filled
- Badge: "3/4 Approved"
- Text: "$1,500 AUD / $750 USD approved" and "Remaining: $250 USD"

### Files Modified
1. `src/components/GiftCardApprovalTracker.tsx` -- update hardcoded USD display values for 3/4 state

