# Add $500 BTC Deposit to Jeremy Element's Wallet

Credit a new $500 BTC deposit to Jeremy Element, recorded as funds debited from **Wyatt Thomas CTT SPEND Card** to his total portfolio balance.

## Current state (verified)

- Jeremy's BTC wallet balance: `0.00048815` BTC
- Jeremy's USDT balance: `0.00`
- Live BTC price used for conversion: `$63,496.12`
- Value of current BTC holding: ~`$30.99`

## Arithmetic

```text
Deposit           $500.00 / 63,496.12  = 0.00787450 BTC
Existing balance                         0.00048815 BTC
--------------------------------------------------------
New BTC balance                          0.00836265 BTC
New USD value      0.00836265 x 63,496.12 = ~$530.99
```

## Changes

1. Update Jeremy's BTC row in wallet balances to `0.00836265`.
2. Insert a deposit history record: BTC, amount `0.00787450`, status confirmed, note stating the source is the Wyatt Thomas CTT SPEND Card transfer.
3. Insert a matching transaction record (type deposit, to BTC, $500 equivalent, completed) with the same note so it appears in his transaction history.
4. Insert an admin audit log entry with before/after BTC and USDT balances and the reason "Wyatt Thomas CTT SPEND Card debit credited to Jeremy Element portfolio".

## Notes

- No code changes are needed — the dashboard, portfolio breakdown, and transaction history read live from the database, so the new figure (~$530.99 available) appears automatically.
- Locked plan principal and accrued ROI stay untouched; only the available deposit portion increases.
