# More webmail templates

Add a larger set of ready-made starting points to the Webmail composer, so you can pick a message type and only fill in the specifics.

## New templates

Existing: Blank message, Account notice, Deposit / withdrawal update, Support reply.

Adding:

1. **Deposit confirmed** — amount/coin credited, portfolio updated, button to the wallet.
2. **Deposit pending / awaiting confirmations** — funds seen on-chain, awaiting network confirmations.
3. **Withdrawal approved & sent** — amount, fee, destination address, network.
4. **Withdrawal rejected / needs action** — reason placeholder and next step.
5. **Plan activated** — plan name, principal, start date, daily trading now live.
6. **Plan top-up required** — remaining amount needed to reach the plan minimum, button to deposit.
7. **CTT card activated** — card is live, PIN reminder, no card details in email.
8. **Card action required (frozen / security)** — card frozen, what to do next.
9. **Identity / verification request** — what to submit and how (via live chat), no attachments.
10. **Password / security notice** — a security-relevant account change was made.
11. **Referral bonus credited** — bonus amount and referred user placeholder.
12. **General announcement to one user** — neutral account-related notice.

Each template pre-fills subject, an optional email heading, and a body with `[bracketed placeholders]` you replace before sending; some also pre-fill a call-to-action button label and link (wallet, plans, transaction history). Everything stays fully editable, and the live preview updates as you type.

Templates are grouped in the picker (Account, Funds, Plans, Card, Security, Other) so the longer list stays easy to scan.

## Guardrails kept

Still one recipient per send, still account/support mail only — nothing promotional, no newsletters, no bulk lists. No attachments; where documents are needed the template asks the user to share via live chat.

## Technical notes

- All work is in `src/components/webmail/Composer.tsx`: expand the `PRESETS` map into grouped entries with `subject`, `heading`, `body`, and optional `buttonLabel` / `buttonUrl`, and render the picker with `SelectGroup` / `SelectLabel`.
- `applyPreset` also sets heading and button fields (clearing them when a preset omits them).
- No changes to the email template, send function, or database — the existing `admin-message` template already renders heading, paragraphs and an optional button, so no redeploy is required.
