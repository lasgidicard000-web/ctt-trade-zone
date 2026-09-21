# Profit & loss review in the admin Live Trading tab

A new "Profit & loss review" section at the top of the Live Trading tab so you can see exactly what a member has made or lost before you approve any money for them.

## What you'll see

### Platform summary
Four figures across the top of the section:
- Total profit (sum of all winning trades' realised results)
- Total loss (sum of all losing trades)
- Net profit/loss across all live accounts
- Fees collected

### Per-member profit & loss table
One row per live member showing:
- Member name
- Amount funded
- Realised profit/loss (green or red)
- Unrealised profit/loss on open positions (current price vs. entry price)
- Net position: funded + realised + unrealised, i.e. what the account is really worth
- Withdrawn to date, and pending withdrawal amount
- A verdict badge: **In profit**, **At a loss**, or **Break even**
- A warning flag when a pending withdrawal is larger than funded + realised profit, so you can see when a payout would exceed what the account genuinely earned

Expanding a row shows that member's last trades (pair, side, size, price, fee, result) so the numbers are traceable.

### Attached to every approval
Each pending withdrawal card in the queue below gains a compact P&L line for that member — realised profit/loss, unrealised, net position and the "payout exceeds earnings" flag — shown right above the Approve / Decline buttons. The same summary appears in the Manage dialog before you credit or debit a balance.

## Technical notes

- New admin RPC `admin_live_pnl_summary()` — SECURITY DEFINER, `has_role(auth.uid(),'admin')` gated, granted to `authenticated` and `service_role`. Returns one row per user with: `user_id`, `display_name`, `funded_total`, `realized_pnl`, `unrealized_pnl` (from `live_holdings` valued at `live_price(coin_symbol)`), `fees_total`, `gross_profit`, `gross_loss`, `withdrawn_total`, `pending_withdrawal_total`, `trades_count`, `last_trade_at`. Loss/profit split comes from `live_trades.pnl` (positive vs. negative), fees from `live_trades.fee`, withdrawals from `withdrawals` rows whose `notes` start with `Live trading`.
- `src/components/admin/AdminLiveTrading.tsx` — add a `PnlRow` interface, fetch the new RPC inside the existing `load()` batch, add the summary cards + P&L table with expandable trade detail, and a small `MemberPnlSummary` block reused in the withdrawal cards and the Manage dialog. Colour via existing semantic classes already used in the file.
- No changes to how balances are computed or approved; this section is read-only reporting around the existing approve/decline and credit/debit actions.
