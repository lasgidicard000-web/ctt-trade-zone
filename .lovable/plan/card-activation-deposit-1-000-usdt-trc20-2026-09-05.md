# Card activation deposit: $1,000 USDT (TRC20)

Add a clear activation step to the CTT spend card section: deposit $1,000 worth of USDT on the TRC20 (Tron) network to activate the card and start using it.

## What the user sees

A new "Activate your CTT spend card" panel directly under the card, above the existing controls:

- Headline requirement: **Deposit $1,000 worth of USDT (TRC20)** to complete activation and unlock spending.
- The TRC20 deposit address `TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L` shown in full, with a one-tap Copy button and a QR code to scan.
- Network warning: send only USDT on the TRC20 (Tron) network — wrong network means permanent loss.
- Progress line: current USDT-equivalent credited toward activation vs. the $1,000 target, with a progress bar (reads the user's existing USDT wallet balance; no new balance logic).
- "I have sent the deposit" button that copies the deposit details (amount, network, address, user name) and opens the live chat, matching how other deposit confirmations in the app work.
- Once the requirement is met (or the card is already active), the panel collapses into a green "Activation deposit received — card ready to spend" confirmation instead of showing the address.

The panel appears in both places the card is rendered (wallet dashboard and General member dashboard) since both use the same card component.

## Technical notes

- New component `src/components/card/CardActivationDeposit.tsx`: static TRC20 address constant, `QRCodeSVG` (already used on the wallet page), copy-to-clipboard + toast, progress bar from the `wallet_balances` USDT row, and the Tawk.to clipboard hand-off pattern already used for gift/spend card forms.
- Render it inside `src/components/CttDebitCard.tsx` — shown for both the pending-issuance state and an issued card that has not yet met the deposit, hidden when satisfied.
- Presentation only: no schema changes, no changes to card issuance, spend, PIN, limits or withdrawal logic. Design tokens only, no hardcoded colors.
