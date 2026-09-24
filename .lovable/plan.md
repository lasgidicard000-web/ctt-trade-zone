# Field Marshal Top-Up button on every wallet dashboard

## What members see
- A new **Upgrade to Field Marshal** banner near the top of the wallet dashboard, showing the Field Marshal badge.
- It shows the $10,000 minimum, the member's current available balance and how much more they need to add.
- **Top Up Now** opens the existing Add Funds window (BTC address and QR code).
- **Upgrade to Field Marshal** opens the existing Purchase Plan window with Field Marshal already selected.
- The wording follows the Field Marshal rules already in place: returns aren't guaranteed, and payouts need admin approval.
- Members who already have an active Field Marshal plan see a short "Field Marshal Plan active" note in place of the banner.
- The banner also appears on the General member dashboard.

## Technical notes
- New `src/components/FieldMarshalUpgradeBanner.tsx`, based on `CommissionersTopUpBanner`. It reads the Field Marshal row from `plan_templates` (name ilike '%field marshal%', active) and checks `user_investments` for an active `field` plan.
- `PurchasePlanDialog` gets an optional `defaultTemplateName` prop that preselects a plan when the window opens.
- `Wallet.tsx` renders the banner above the Commissioners banner and passes `totalPortfolioValue`, `setAddFundsDialogOpen`, and a handler that opens the purchase window preset to Field Marshal. `GeneralDashboard.tsx` gets the same banner.
- Colours use semantic tokens and the Field Marshal badge styling. The badge img tag is 1024x1024.
- No database changes.
