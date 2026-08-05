# Bolder, complete details on the CTT card face

## What changes

The card face keeps the PIN gate, but every field becomes larger, bolder and clearly labelled so the card reads as a complete card in both states.

- **Card number** — bigger, bold monospace with wider digit spacing; masked groups (`•••• •••• •••• 1234`) stay just as bold as the unlocked number.
- **Card holder** — bold uppercase, full-strength text instead of the current faded small line.
- **Expires** — bold `MM/YY`, masked as `••/••` until unlocked.
- **CVV** — bold 3-digit value, masked as `•••` until unlocked, sitting in its own labelled block next to Expires.
- **Labels** ("CARD NUMBER", "CARD HOLDER", "EXPIRES", "CVV") get stronger contrast and consistent letter-spacing so no field looks unfinished.
- Layout on the lower half of the card is rebalanced into a clear row so all three of holder / expires / CVV stay fully visible on a 430px-wide phone without truncation.
- A small locked hint appears next to the masked fields ("Unlock to view") so the masked state reads as intentional rather than missing data.

Unlock behaviour, the 60-second auto-hide, countdown, copy confirmation and audit logging all stay exactly as they are.

## Technical notes

- Single-file change: `src/components/CttDebitCard.tsx` — presentation only, no data or RPC changes.
- Replace the low-opacity `text-[9px]` / `text-xs` field styling in the card face block with a shared label class (uppercase, tracking, ~10px, higher opacity) and value classes (`font-bold`, `font-mono` for number/expiry/CVV, responsive `text-base sm:text-lg` for the number).
- Keep using semantic tokens already in place (`text-primary-foreground` on the gradient) — no hardcoded colour utilities.
