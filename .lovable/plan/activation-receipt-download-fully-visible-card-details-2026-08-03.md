# Activation receipt download + fully visible card details

## 1. Activation receipt button on the dashboard

Add a **Download activation receipt** button to each active investment card on the wallet dashboard (so the Commissioners Plan gets one, and every other plan too).

The generated PDF matches the branded style of the existing deposit receipt and includes:
- Account name and email
- Plan name and tier, principal used, duration, activation date, cycle end date
- Today's rolled ROI rate, average rate to date, ROI band (min–max), accrued profit and current total value
- Tier entitlements: withdrawal fee, daily withdrawal cap, priority support, premium features, community access
- Audit references: investment ID, plan template ID, user ID, issue timestamp

Data comes from what the card already has in memory (investment row, ROI history, ROI band) plus the user's entitlements row and profile — no new tables or database changes.

## 2. CTT card shows CVV, expiry and their labels visibly

On the CTT debit/spend card face:
- The card number, **EXP** and **CVV** are always rendered with small uppercase labels above each value, and the figures beneath them in a clear mono font at a readable size (no longer hidden behind the reveal toggle).
- Card details are fetched once for the card owner on load so expiry and CVV render immediately.
- The reveal toggle now only switches the card number between masked (•••• 4821) and full PAN; expiry and CVV stay visible.
- Layout adjusted so the three fields sit in a row that stays readable on mobile (430px) without clipping.

## Technical notes

- New `src/lib/planActivationReceipt.ts` — jsPDF generator mirroring `src/lib/depositReceipt.ts` (same header, `row`/`section` helpers, one-page layout).
- `src/components/ActiveInvestmentCard.tsx` — add the button per investment; load `profiles` + `plan_entitlements` (via existing `get_user_entitlements` / `useEntitlements` pattern) for receipt fields.
- `src/components/CttDebitCard.tsx` — call `reveal()` once on mount to populate expiry/CVV, restructure the card footer into labelled number / EXP / CVV blocks using existing semantic tokens; keep freeze, PIN, spend, transactions and terminate behaviour unchanged.
- No database migration, no backend changes.
