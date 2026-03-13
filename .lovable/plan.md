

## Plan: Deduct Full Balance to Bank of Scotland SCCBA Account

### Current State
- Jeremy Element's BTC balance: **0.10130000 BTC** (~$10,425 at current price $102,916.67)

### Changes

**1. Database Migration (wallet_balances)**
- Set BTC balance to **0** for user `a9292523-50fe-4d49-a262-8620811f075c`

**2. Database Migration (transactions)**
- Insert a completed withdrawal transaction for **$10,425 USD** with notes: `"Bank of Scotland SCCBA — Recipient: Wyatt Thomas — Full BTC balance withdrawal (0.10130 BTC)"`
- Type: `withdrawal`, from_symbol: `BTC`, to_symbol: `USD`, status: `completed`

**3. No code changes needed**
- The wallet dashboard already reads from `wallet_balances` and will show $0
- The transaction history page already displays notes in accent color
- The AGCSB badge remains unchanged (separate transaction)

### Files Modified
- None (database-only changes via migration)

