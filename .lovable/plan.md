

## Plan: Unlock All Crypto Wallet Addresses for Jeremy Element

### Problem
The `WalletAddresses` component currently hardcodes the lock/unlock logic based on `isBTC` -- only BTC is shown as active, and all other coins (ETH, USDT, BNB, CTT) are always shown as locked regardless of whether the user has paid the $500 activation fee.

### Solution
Modify the `WalletAddresses` component to accept the user's BTC balance and BTC price, then check if the wallet is activated (BTC value >= $500). When activated, all addresses will be shown as unlocked and copyable.

### Changes

#### 1. Update `WalletAddresses` component props
Add `btcBalance` and `btcPrice` props so the component can determine activation status.

#### 2. Update unlock logic in `WalletAddresses`
Replace the hardcoded `isBTC` check with an `isActivated` flag:
- If `btcBalance * btcPrice >= 500`, all addresses are unlocked (green border, copy button enabled, no "ACTIVATION REQUIRED" badge)
- If not activated, keep current behavior (only BTC active, others locked)

#### 3. Update the Wallet page
Pass `btcBalance` and `btcPrice` to the `WalletAddresses` component from the existing wallet data already available in `Wallet.tsx`.

### Technical Details

**File: `src/components/WalletAddresses.tsx`**
- Add `btcBalance` and `btcPrice` to the props interface
- Calculate `isWalletActive = btcBalance * btcPrice >= 500`
- Change the rendering condition from `isBTC` to `isBTC || isWalletActive`
- When active: all coins get green border, "ACTIVE" badge, working copy button
- Update the alert banner to show a success message when wallet is activated

**File: `src/pages/Wallet.tsx`**
- Pass two additional props to `WalletAddresses`:
  - `btcBalance={walletBalances.find(b => b.coin_symbol === 'BTC')?.balance || 0}`
  - `btcPrice={coinPrices.find(c => c.symbol === 'BTC')?.price || 0}`

No database changes needed -- Jeremy's 0.005 BTC balance already exceeds the $500 threshold.

