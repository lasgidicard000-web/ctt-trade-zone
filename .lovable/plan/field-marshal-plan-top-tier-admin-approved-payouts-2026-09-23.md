# Field Marshal plan (top tier, admin-approved payouts)

## What members see
- A new **Field Marshal Plan** card above General on the Investment Plans page, with a $10,000 minimum.
- No fixed or promised return rate. The card says returns aren't guaranteed and depend on actual performance.
- Tier 6 benefits: the lowest withdrawal fee, the highest daily withdrawal cap, priority support, premium features and community access.
- A **Request payout** button that sends part of the member's real available balance to their saved external wallet. Each request shows as Pending until an admin approves or declines it.
- Nothing is sent out automatically. There are no daily auto-payouts and no instant copying of the dashboard to outside accounts.

## What admins see
- Field Marshal payout requests appear in the existing withdrawals queue with a "Field Marshal" tag.
- Approving a request needs a transaction hash, the same as other withdrawals. Declining it refunds the held amount.
- A new Field Marshal option when assigning plans to members in Admin Plans.

## Technical notes
- Add a `field_marshal` row to plan_entitlements: tier_rank 6, fee 0.25%, cap $50,000.
- Add a Field Marshal row to plan_templates: min $10,000, max $1,000,000, 90 days. Its rate fields are set to 0, so no ROI is rolled automatically. Any returns are set only by an admin through the existing ROI regulator.
- Payout requests reuse the `withdrawals` table and the process-withdrawal flow, with notes starting "Field Marshal payout". There's no automated bank or wallet sending.
- Add a Field Marshal badge colour and icon to planBadges and EntitlementsCard.
