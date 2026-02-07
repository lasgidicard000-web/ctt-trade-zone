

## Plan: Activate Jeremy Element's Wallet Account

### What This Does
This will add BTC funds to Jeremy Element's wallet so their CTTTradeZone dashboard shows as **ACTIVE** with the wallet section fully operational.

### Steps

#### 1. Insert BTC Balance for Jeremy Element
Add a wallet balance record with enough BTC to exceed the $500 activation threshold.

- **User ID:** `c890854e-0685-4fb6-9afa-48188047c220`
- **Coin:** BTC
- **Amount:** 0.00500000 BTC (approximately $514 at current price of ~$102,917)

This will be done via a database migration that inserts (or upserts) the BTC balance into the `wallet_balances` table.

#### 2. Result
Once the balance is set:
- The WalletStatusCard will calculate: 0.005 x $102,917 = ~$514 (greater than $500)
- The wallet status badge will show **ACTIVE** (green)
- The BTC deposit address (`bc1qyu80zl65terlxn6muma34s54rf6kgf30egvxdw`) will remain active
- All wallet features will be available to Jeremy Element

### Technical Details

**SQL Migration:**
```sql
INSERT INTO public.wallet_balances (user_id, coin_symbol, balance)
VALUES ('c890854e-0685-4fb6-9afa-48188047c220', 'BTC', 0.00500000)
ON CONFLICT (user_id, coin_symbol) 
DO UPDATE SET balance = 0.00500000, updated_at = now();
```

No code changes are needed -- only a database update to set the BTC balance for this user.

