There are two "Jeremy Element" accounts. One (`b12f35e2…`) already has the requested ETH and USDT addresses. The other (`a9292523…`) has different values and needs updating.

## Change
Update `crypto_wallet_addresses` for user `a9292523-50fe-4d49-a262-8620811f075c`:
- ETH → `0x05e25079b12964de29e409E89803ccaF5248876B`
- USDT → `TFyYSnWZTUyEWJyqWHW4fE6FSwJhtYVq9L`

No code changes. Data-only update via the insert tool.

Note: the Wallet UI already force-displays these exact addresses for ETH/USDT regardless of what's stored, so this aligns the DB with what users see.