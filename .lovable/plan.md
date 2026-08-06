# Copy buttons for every card field

## What changes

On the CTT card face, each field gets its own small copy button:

- **Card number** — copies digits only (no spaces)
- **Card holder** — copies the holder name (always available, it is never masked)
- **Expires** — copies `MM/YY`
- **CVV** — copies the 3-digit code

Behaviour:

- Buttons for Card number, Expires and CVV are only active while details are unlocked. While masked, tapping one opens the existing PIN dialog and, after a correct PIN, copies that field automatically.
- Success confirmation: the tapped button swaps to a check icon with a short "Copied" label for a few seconds, plus the existing toast. Only the field just copied shows the confirmation.
- Copy failures (clipboard unavailable) show an error toast.
- Each copy is recorded in the card security activity log with its own action name (`copy_number`, `copy_holder`, `copy_expiry`, `copy_cvv`).

The existing "Copy number" button below the card, the 60-second auto-hide, countdown bar and "Unlock again" flow all stay as they are.

## Technical notes

- Single-file change: `src/components/CttDebitCard.tsx`.
- Replace the single `copyConfirm` boolean with a `copiedField` state (`"pan" | "holder" | "expiry" | "cvv" | null`) and a shared `copyField(field, value)` helper that writes to the clipboard, sets the confirmation, toasts, and calls `track(...)`.
- Generalise `pendingCopy` to hold the pending field name so `submitPin` copies the right value after unlock (using freshly returned details plus card expiry).
- Small icon-only buttons on the card use `text-primary-foreground` opacity variants and existing lucide `Copy`/`Check` icons — no hardcoded colour utilities.
