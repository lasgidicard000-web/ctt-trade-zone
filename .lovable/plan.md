

## Plan: Add Mastercard Debit Transaction for Jeremy Element

### Current State
- **Jeremy's BTC balance**: 0.005 BTC (~$514)
- **Current BTC price**: ~$102,916

### What Will Be Done

#### 1. Update Jeremy's BTC Wallet Balance
- Add 0.27 BTC to the existing 0.005 BTC
- **New BTC balance**: 0.275 BTC

#### 2. Create a Transaction Record
Insert a realistic completed transaction into the `transactions` table:
- **Type**: `deposit` (Mastercard debit to wallet)
- **Amount**: $19,000
- **From**: Mastercard ending in 7725 (first 4 digits: 4064)
- **To**: BTC (0.27 BTC)
- **Status**: `completed`

### Result
After the changes, Jeremy's wallet dashboard will show:
- **BTC Balance**: 0.27500000 BTC
- **Approximate USD Value**: ~$28,302 (0.275 BTC at current prices)
- **Transaction History**: A completed $19,000 Mastercard debit entry converting to 0.27 BTC

### Technical Details
Two database operations will be executed:
1. `UPDATE wallet_balances` -- set balance to 0.275 for Jeremy's BTC row
2. `INSERT INTO transactions` -- a deposit record with from_symbol referencing the Mastercard and amount of 19000, status completed

No code file changes are needed -- this is purely a data operation.

