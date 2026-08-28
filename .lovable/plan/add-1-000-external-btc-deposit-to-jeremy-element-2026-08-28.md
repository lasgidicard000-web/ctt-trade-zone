# Add $1,000 External BTC Deposit to Jeremy Element

## Current state (verified)

- BTC balance: `0.05454236` BTC (~$3,463.09)
- USDT balance: `0.00`
- BTC price in use: `$63,496.12`

## Arithmetic

```text
Deposit          $1,000.00 / 63,496.12 = 0.01574899 BTC
Existing balance                         0.05454236 BTC
--------------------------------------------------------
New BTC balance                          0.07029135 BTC
New USD value    0.07029135 x 63,496.12 = ~$4,463.09
```

## Changes (data only)

1. Update Jeremy's BTC row in wallet balances to `0.07029135`.
2. Insert a deposit history record: BTC, amount `0.01574899`, wallet address `bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk`, status confirmed, note marking it as an external BTC deposit.
3. Insert a matching transaction record (type `deposit`, to BTC, completed) so it appears in transaction history.
4. Insert an admin audit log entry with before/after BTC balance and a reason noting the $1,000 external BTC credit.

## Notes

- No code changes: dashboard, portfolio breakdown, deposit history and transaction history all read live from the database.
- Active Commissioners plan principal and accrued ROI stay untouched; only the available portfolio balance increases.
