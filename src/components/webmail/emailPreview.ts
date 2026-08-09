interface PreviewFields {
  heading?: string;
  subject?: string;
  recipientName?: string;
  body?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Branded preview of the admin-message email, matching the real template. */
export const buildPreviewHtml = ({
  heading = "",
  subject = "",
  recipientName = "",
  body = "",
  buttonLabel = "",
  buttonUrl = "",
}: PreviewFields) => {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
      <div style="padding:24px;max-width:600px">
        <div style="background:#10102E;border-radius:12px;padding:16px 20px;margin:0 0 24px">
          <p style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:.5px;margin:0">CTTTradezone</p>
        </div>
        <h1 style="font-size:24px;color:#10102E;margin:0 0 20px;line-height:1.3">${esc(heading || subject || "Subject")}</h1>
        ${recipientName ? `<p style="font-size:16px;color:#5B6472;line-height:1.6;margin:0 0 20px">Hi ${esc(recipientName)},</p>` : ""}
        ${paragraphs
          .map(
            (p) =>
              `<p style="font-size:16px;color:#5B6472;line-height:1.6;margin:0 0 20px;word-break:break-word">${esc(p)}</p>`
          )
          .join("")}
        ${
          buttonLabel && buttonUrl
            ? `<a href="#" style="background:#1111D4;color:#fff;font-size:16px;border-radius:12px;padding:16px 28px;font-weight:bold;display:inline-block;text-decoration:none">${esc(buttonLabel)}</a>`
            : ""
        }
        <div style="margin:28px 0 0">
          <a href="#" style="background:#fff;color:#1111D4;border:2px solid #1111D4;font-size:16px;border-radius:12px;padding:14px 26px;font-weight:bold;display:inline-block;text-decoration:none">Reply to this message</a>
          <p style="font-size:14px;color:#8A93A3;line-height:1.6;margin:14px 0 0">Replying by email will not reach us — use the button above to send your reply securely inside CTTTradezone.</p>
        </div>
        <p style="font-size:13px;color:#8A93A3;line-height:1.6;margin:32px 0 0">CTTTradezone Investment Center — this message was sent by our support team regarding your account.</p>
      </div></body></html>`;
};
