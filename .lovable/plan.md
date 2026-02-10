

## Plan: Adjust Jeremy's BTC Balance to Reflect $19,514 Total

### Problem
The current 0.275 BTC balance yields ~$28,302 at today's BTC price ($102,916.67). The correct total should be **$19,514** ($514 irremovable reserve + $19,000 Mastercard deposit).

### What Will Be Done

#### 1. Recalculate Correct BTC Balance
- Target USD value: $19,514
- Current BTC price: $102,916.67
- Required BTC balance: $19,514 / $102,916.67 = **0.18962 BTC** (approximately)
  - Original reserve: ~0.00500 BTC ($514)
  - Mastercard deposit: ~0.18462 BTC ($19,000)

#### 2. Update Wallet Balance
Update Jeremy's BTC balance from 0.275 to **0.18962000** so the dashboard displays ~$19,514.

#### 3. Update Transaction Record
Update the existing Mastercard transaction amount to reflect the correct BTC conversion (~0.18462 BTC for $19,000 at the current rate).

### Result
- **BTC Balance**: ~0.18962 BTC
- **USD Value**: ~$19,514
  - $514 irremovable reserve
  - $19,000 Mastercard (4064...7725) deposit

### Technical Details
1. `UPDATE wallet_balances SET balance = 0.18962000` for Jeremy's BTC row
2. Optionally update the transaction record's `to_symbol` description to reflect the corrected 0.18462 BTC conversion amount

No code changes needed -- data-only operation.
