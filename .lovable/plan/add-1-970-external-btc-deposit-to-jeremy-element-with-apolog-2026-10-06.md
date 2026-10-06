# Add $1,970 External BTC Deposit to Jeremy Element (with apology note)

## Current state (verified)

- BTC balance: `-0.00792109` BTC (about -$678, left over from the earlier $800 debit)
- USDT balance: `1750.03325063`
- BTC price in use: `$85,600.24`

## Arithmetic

```text
Deposit          $1,970.00 / 85,600.24 = 0.02301395 BTC
Existing balance                        -0.00792109 BTC
-------------------------------------------------------
New BTC balance                          0.01509286 BTC  (~$1,291.95)
```

Because the BTC balance is currently negative, about $678 of the deposit fills that gap first. His total portfolio goes up by the full $1,970.

## Changes (data only)

1. Set Jeremy's BTC wallet balance to `0.01509286`.
2. Add a confirmed deposit record: BTC, `0.01574899`-style amount `0.02301395`, wallet `bc1q76qphckpcegrj3qc5y57qr4vvs8p9hprlypsrk`, with the note: "External BTC deposit ($1,970.00). We apologise for the delay in approving this payment — it was caused by a 24-hour CTT rebranding process."
3. Add a matching completed transaction (type deposit, to BTC) with the same note so it shows in his transaction history.
4. Add an admin log entry with the before/after BTC balance and the reason "$1,970 external BTC deposit credited after delayed approval (CTT rebranding)".

## Notes

- No code changes. His dashboard, deposit history and transaction history update automatically.
- Plan principal, ROI and the existing $1,750 entry stay as they are.
