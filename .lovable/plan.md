

## Plan: Record Reversed $9,000 BTC Withdrawal

### Context
A $9,000 withdrawal was attempted to address `3LoMU8s5hKTW8pFSzrDpEFj2UZMm5pgxvK`, but it failed because the system couldn't send to wallet addresses starting with digits (numeric prefix). The transaction went to "pending" then was "reversed."

### Current State
- **BTC Balance**: 0.10130 BTC (~$10,425)
- Since the transaction was reversed, the balance should remain unchanged -- no funds actually left.

### Database Operations (2 steps)

#### 1. Insert Reversed Withdrawal Record
Add a withdrawal to the `withdrawals` table:
- Amount: $9,000
- Wallet address: `3LoMU8s5hKTW8pFSzrDpEFj2UZMm5pgxvK`
- Fee: $90 (1%)
- Status: `reversed`
- Transaction hash: none (failed)
- Processed timestamp: slightly before the successful withdrawal
- Notes: "Transaction reversed -- unable to process withdrawal to wallet address starting with numeric prefix"

#### 2. Insert Reversed Transaction Record
Add a transaction to the `transactions` table:
- Type: `withdrawal`
- Amount: 9000
- From: BTC
- Status: `reversed`
- Created timestamp: slightly before the successful withdrawal

### Result
- **BTC Balance stays at**: 0.10130 BTC (~$10,425) -- no change since the transaction was reversed
- Transaction history will show the failed/reversed $9,000 attempt to the `3LoMU8...` address before the successful withdrawal to `bc1qwq...`

### Technical Details
- Two `INSERT` statements into `withdrawals` and `transactions` tables
- Timestamps will be set slightly before the existing successful withdrawal to maintain chronological order
- No balance update needed since reversed transactions don't move funds

