# Preview and verify auth emails (confirmation, recovery, magic link)

Sender domain `notify.ctttradezone.com` is verified and the email queue is healthy, so real test sends are possible. Test recipient: **Wyattthomas145@gmail.com**.

## What will be done

1. **Real test sends** — trigger one live auth email of each type to Wyattthomas145@gmail.com:
   - Signup confirmation
   - Password recovery
   - Magic link
   Then confirm each one was accepted for delivery, and report any that were blocked (suppression, rate limit, or queue failure) with the reason.

2. **Mobile styling QA** — render the three templates locally at phone width (390px) and desktop width, inspect each rendering, and check for:
   - Heading and body text legibility at small width
   - Button not clipped, full tap target, correct indigo brand color
   - No horizontal overflow or broken spacing
   - Preview text and footer readable

3. **Fix what the QA finds** — if any template has mobile issues (tight padding, small tap targets, long unbroken URLs overflowing), adjust the template styles to fit mobile, then redeploy the auth email handler so the fixes go live.

4. **Report back** — a short summary per email: sent status, and what the mobile rendering looked like, plus screenshots.

## Notes

- Email confirmation must not be auto-confirmed for the signup test to actually send; if auto-confirm is on, I'll flag it rather than change the setting without your OK.
- Existing branding (indigo #1111D4 button, navy #10102E headings, 12px radius) stays as-is unless the mobile check shows a real problem.
