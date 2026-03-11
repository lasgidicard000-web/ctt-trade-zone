

## Plan: Make AGCSB Badge Clickable with Filtered Transaction History

### Changes

**1. `src/components/AGCSBCreditBadge.tsx`**
- Import `useNavigate` from react-router-dom
- Wrap the Card in a clickable element that navigates to `/transactions?filter=agcsb`
- Add cursor-pointer and hover styles

**2. `src/pages/TransactionHistory.tsx`**
- Read `filter` query param using `useSearchParams`
- When `filter=agcsb`, auto-set a search/filter that shows only AGCSB transactions (filter transactions where notes contain "AGCSB")
- Add a text search filter state or use existing filters to match notes containing "AGCSB"

### Files Modified
1. `src/components/AGCSBCreditBadge.tsx` — add navigation on click
2. `src/pages/TransactionHistory.tsx` — read URL param and apply AGCSB filter on mount

