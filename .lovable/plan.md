# Add $792 BTC Deposit to Jeremy Element's Wallet

## Current state (verified)

- Jeremy's BTC balance: `0.00836265` BTC (~$530.99)
- Jeremy's USDT balance: `0.00`
- BTC price in use: `$63,496.12`

## Arithmetic

```text
Deposit          $792.00 / 63,496.12 = 0.01247322 BTC
Existing balance                       0.00836265 BTC
------------------------------------------------------
New BTC balance                        0.02083587 BTC
New USD value    0.02083587 x 63,496.12 = ~$1,322.99
```

## Changes

1. Update Jeremy's BTC row in wallet balances to `0.02083587`.
2. Insert a deposit history record: BTC, amount `0.01247322`, status confirmed.
3. Insert a matching transaction record (type deposit, to BTC, completed) so it appears in his transaction history.
4. Insert an admin audit log entry with before/after BTC and USDT balances and a reason noting the $792 BTC credit.

## Notes

- No code changes needed — dashboard, portfolio breakdown, and transaction history read live from the database.
- Locked plan principal and accrued ROI stay untouched; only the available deposit portion increases.
