# Move Wallet Copilot Launcher to Bottom Left

Reposition the floating Wallet Copilot button on the wallet dashboard from the bottom-right corner to the bottom-left corner.

## Change

- The launcher button currently sits pinned to the bottom-right of the screen. It moves to the bottom-left with the same size, styling, icon and label.
- Nothing else changes: the slide-in panel, the Explain buttons, and all copilot behaviour stay exactly as they are.

## Technical notes

- `src/components/wallet/WalletCopilot.tsx`: on the floating launcher `Button`, swap `right-5` for `left-5` (keeping `fixed bottom-5 z-40`).
