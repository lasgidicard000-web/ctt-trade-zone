# Add $1,000 External BTC Deposit to Jeremy Element

## Current state (verified)

- BTC balance: `0.03299775` BTC (~$2,095.24)
- USDT balance: `0.00`
- BTC price in use: `$63,496.12`
- Commissioners Plan active at $2,000 locked (untouched by this deposit)

## Arithmetic

```text
Deposit          $1,000.00 / 63,496.12 = 0.01574899 BTC
Existing balance                         0.03299775 BTC
--------------------------------------------------------
New BTC balance                          0.04874674 BTC
New USD value    0.04874674 x 63,496.12 = ~$3,095.24
```

## Changes

1. Update Jeremy's BTC row in wallet balances to `0.04874674`.
2. Insert a deposit history record: BTC, amount `0.01574899`, wallet address `bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk`, status confirmed, note marking it as an external deposit.
3. Insert a matching transaction record (type deposit, to BTC, completed) so it shows in transaction history.
4. Insert an admin audit log entry with before/after BTC balance and a reason noting the $1,000 external BTC credit.

## Notes

- No code changes needed — dashboard, portfolio breakdown, deposit history and transaction history all read live from the database.
- Locked plan principal and accrued ROI stay untouched; only the available portfolio balance increases.
