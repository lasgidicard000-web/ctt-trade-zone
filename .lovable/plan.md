## Replace BTC Deposit Address

Swap the hardcoded BTC wallet address used across the dashboard deposit flow.

- **Old:** `bc1qyu80zl65terlxn6muma34s54rf6kgf30egvxdw`
- **New:** `bc1qhez04ha009fea990ut2ywr7jtcq0nq8c0hcr2a`

### Changes

- `src/components/WalletAddresses.tsx` — update the `FIXED_BTC_ADDRESS` constant to the new address. This is the address shown (and copied) in the dashboard's BTC deposit card and used as the activation/reserve target.
- Scan the rest of the codebase (`rg "bc1qyu80"`) for any other hardcoded references (e.g. WalletStatusCard, Caltex card BTC purchase, edge functions, docs) and replace each occurrence so deposit instructions stay consistent everywhere.
- Update the memory entry for "Wallet ACTIVE status" / activation rule to reference the new address.

### Out of scope

- No DB schema changes. Existing `crypto_wallet_addresses` rows for BTC are ignored at render time because the component always renders `FIXED_BTC_ADDRESS` for BTC.
- No change to the $500 BTC activation threshold or to non-BTC addresses.
