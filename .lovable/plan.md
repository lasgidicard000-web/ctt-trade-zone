

## Plan: Add Gift Card Redemption Approval Section to Wallet

### Overview
Add a new visual section to the Wallet page that displays the approved gift card transaction with a geometric progress indicator showing the 1/4 approval status of a $500 AUD Apple Gift Card toward a $1,000 target.

### Database Operations

**1. Insert Redemption Record**
Add a record to the `redemptions` table for Jeremy Element:
- Gift card type: Apple
- Gift card currency: AUD
- Amount: $500
- Status: `approved` (1/4 approved)
- Crypto symbol: BTC

**2. Insert Transaction Record**
Add a corresponding transaction to the `transactions` table:
- Type: `deposit`
- Amount: 125 (1/4 of $500 = $125 AUD approved portion)
- From symbol: AUD
- To symbol: BTC
- Status: `completed`

### UI Component: Gift Card Approval Tracker

Create a new component `GiftCardApprovalTracker` that displays:

**Visual Layout:**
- Card with "Gift Card Redemption Status" header
- Apple Gift Card details ($500 AUD, submitted to $1,000 target)
- A geometric grid of 4 squares/segments arranged in a 2x2 grid:
  - 1 filled/colored square (approved - 25%)
  - 3 empty/outlined squares (pending)
- Progress bar showing 25% completion
- Status badge: "1/4 Approved"
- Breakdown text: "$125 AUD approved / $500 AUD total"

**Geometric Display:**
- 4 hexagonal or square tiles in a grid layout
- First tile: filled with green/accent color, checkmark icon
- Remaining 3 tiles: outlined with dashed borders, pending state
- Animated fill effect on the approved segment
- Circular progress ring alternative alongside the grid

### Integration
- Add the new component to the Wallet page between the WalletStatusCard and RewardsSection
- Component fetches from `redemptions` table for the logged-in user
- Only displays when there are active/approved redemptions

### Files to Create/Modify
1. **New:** `src/components/GiftCardApprovalTracker.tsx` - The geometric approval display component
2. **Modified:** `src/pages/Wallet.tsx` - Import and render the new component

### Technical Details
- Uses existing Progress component from shadcn/ui
- CSS grid for the geometric 2x2 tile layout
- Tailwind animations for the approved segment glow effect
- Fetches redemption data via Supabase client filtered by user_id
