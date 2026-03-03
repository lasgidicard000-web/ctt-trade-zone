

## Plan: Add BTC Conversion Summary to Gift Card Tracker

### Overview
Add a new section to the `GiftCardApprovalTracker` component that displays the total BTC amount converted from the AUD gift cards, with accurate calculations.

### Conversion Calculation
- Total gift cards: 4 x $500 AUD = $2,000 AUD
- USD equivalent (target): $1,000 USD
- Current BTC price: ~$102,916.67
- BTC received: $1,000 / $102,916.67 = **0.00971 BTC**

### UI Changes

**File: `src/components/GiftCardApprovalTracker.tsx`**

Add a new "BTC Conversion Summary" section between the progress bar and the footer text. It will include:

1. A styled card/section with a Bitcoin icon (using the lucide `Bitcoin` icon or a custom BTC label)
2. Display showing:
   - Total AUD submitted: $2,000 AUD
   - USD value: $1,000 USD  
   - BTC received: 0.00971 BTC (hardcoded accurate amount)
3. A breakdown per segment showing $250 USD = ~0.00243 BTC each
4. Styled with accent colors to match the completion celebration theme

### Technical Details
- Add a constant `BTC_CONVERTED = 0.00971` for the total BTC amount
- Add a constant `BTC_PER_SEGMENT = 0.00243` for per-segment breakdown
- Import the `Bitcoin` icon from lucide-react (or use a text-based "BTC" label)
- The section renders a grid showing the conversion flow: AUD -> USD -> BTC
- Only shows when there are approved segments

