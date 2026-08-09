import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Save, Send } from "lucide-react";
import type { AdminUser, MailDraft } from "./types";

const SIGNOFF = "The CTTTradezone team";

interface Preset {
  label: string;
  group: string;
  subject: string;
  heading?: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
}

const PRESETS: Record<string, Preset> = {
  blank: { label: "Blank message", group: "Other", subject: "", body: "" },
  account: {
    label: "Account notice",
    group: "Account",
    subject: "An important notice about your CTTTradezone account",
    heading: "An important account notice",
    body:
      `We're reaching out with an update regarding your CTTTradezone account.\n\n[Write the details here.]\n\nIf you have any questions, use the reply button below and our team will assist you.\n\n${SIGNOFF}`,
  },
  funds: {
    label: "Deposit / withdrawal update",
    group: "Funds",
    subject: "Update on your recent transaction",
    heading: "Update on your recent transaction",
    body:
      `Your recent transaction has been reviewed by our team.\n\n[Add the amount, coin and current status here.]\n\nYou can view the full details from your dashboard at any time.\n\n${SIGNOFF}`,
    buttonLabel: "View transaction history",
    buttonUrl: "https://ctttradezone.com/transactions",
  },
  support: {
    label: "Support reply",
    group: "Other",
    subject: "Re: your support request",
    heading: "Re: your support request",
    body:
      `Thanks for contacting CTTTradezone support.\n\n[Write your reply here.]\n\nLet us know if there is anything else we can help with.\n\n${SIGNOFF}`,
  },
  depositConfirmed: {
    label: "Deposit confirmed",
    group: "Funds",
    subject: "Your deposit has been confirmed",
    heading: "Deposit confirmed",
    body:
      `Good news — your deposit has been confirmed and credited to your portfolio.\n\nAmount: [$0.00]\nAsset: [BTC]\nCredited: [0.00000000 BTC]\nDate: [date]\n\nYour updated portfolio balance is now visible in your wallet.\n\n${SIGNOFF}`,
    buttonLabel: "Open your wallet",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  depositPending: {
    label: "Deposit pending confirmations",
    group: "Funds",
    subject: "We've seen your deposit — awaiting confirmations",
    heading: "Your deposit is pending",
    body:
      `We can see your incoming transfer on the network and it is waiting for confirmations.\n\nAmount: [$0.00]\nAsset: [BTC]\nStatus: awaiting network confirmations\n\nNo action is needed from you. Your balance updates automatically once the network confirms the transfer.\n\n${SIGNOFF}`,
    buttonLabel: "Open your wallet",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  withdrawalSent: {
    label: "Withdrawal approved & sent",
    group: "Funds",
    subject: "Your withdrawal has been approved and sent",
    heading: "Withdrawal sent",
    body:
      `Your withdrawal request has been approved and processed.\n\nAmount: [$0.00]\nFee: [$0.00]\nNetwork: [BTC / ETH / TRC-20]\nDestination address: [address]\n\nDepending on network conditions, funds usually arrive within a short time of being broadcast.\n\n${SIGNOFF}`,
    buttonLabel: "View transaction history",
    buttonUrl: "https://ctttradezone.com/transactions",
  },
  withdrawalRejected: {
    label: "Withdrawal needs your action",
    group: "Funds",
    subject: "We couldn't process your withdrawal request",
    heading: "Your withdrawal needs attention",
    body:
      `We were unable to process your recent withdrawal request.\n\nAmount requested: [$0.00]\nReason: [explain the reason — e.g. invalid destination address, minimum not met, plan cycle restriction]\n\nWhat to do next: [next step for the user].\n\nOnce that is resolved you can submit the withdrawal again from your wallet.\n\n${SIGNOFF}`,
    buttonLabel: "Open your wallet",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  planActivated: {
    label: "Plan activated",
    group: "Plans",
    subject: "Your [plan name] plan is now active",
    heading: "Your plan is active",
    body:
      `Your investment plan has been activated and daily trading has started.\n\nPlan: [plan name]\nPrincipal: [$0.00]\nStart date: [date]\nDuration: [days]\n\nDaily performance is credited to your dashboard as each trading day completes.\n\n${SIGNOFF}`,
    buttonLabel: "View your plan",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  planTopUp: {
    label: "Plan top-up required",
    group: "Plans",
    subject: "A top-up is needed to activate your [plan name] plan",
    heading: "Top up to activate your plan",
    body:
      `Your selected plan is not active yet because the minimum principal has not been reached.\n\nPlan: [plan name]\nMinimum required: [$0.00]\nCurrent balance towards the plan: [$0.00]\nRemaining to top up: [$0.00]\n\nOnce the remaining amount is deposited, the plan activates and trading begins.\n\n${SIGNOFF}`,
    buttonLabel: "Deposit and activate",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  cardActivated: {
    label: "CTT card activated",
    group: "Card",
    subject: "Your CTT card is now active",
    heading: "Your CTT card is active",
    body:
      `Your CTT card has been activated and is ready to use.\n\nSpending limit: [$0.00]\nStatus: active\n\nFor your security, card number, expiry and CVV are never included in emails — view them in your dashboard after entering your card PIN. Never share your PIN or card details with anyone.\n\n${SIGNOFF}`,
    buttonLabel: "View your card",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  cardAction: {
    label: "Card action required",
    group: "Card",
    subject: "Action required on your CTT card",
    heading: "Your card needs attention",
    body:
      `Your CTT card has been [frozen / restricted] as a precaution.\n\nReason: [explain the reason].\n\nWhat to do next: [next step for the user].\n\nWe will never ask for your PIN or full card details by email.\n\n${SIGNOFF}`,
    buttonLabel: "Open your dashboard",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  verification: {
    label: "Verification request",
    group: "Security",
    subject: "We need to verify a few details on your account",
    heading: "Verification needed",
    body:
      `To continue with [deposit / withdrawal / plan activation], we need to verify a few details on your account.\n\nPlease provide: [list what is needed].\n\nEmails cannot carry attachments, so please share these securely through our live chat on the website, or reply using the button below and our team will guide you.\n\n${SIGNOFF}`,
    buttonLabel: "Reply securely",
    buttonUrl: "https://ctttradezone.com/",
  },
  security: {
    label: "Security notice",
    group: "Security",
    subject: "A security change was made on your account",
    heading: "Security notice",
    body:
      `We're letting you know that a security-relevant change was made on your CTTTradezone account.\n\nChange: [password reset / email change / card PIN update / new sign-in]\nDate: [date]\n\nIf you made this change, no action is needed. If you did not, contact us immediately using the reply button below.\n\n${SIGNOFF}`,
  },
  referralBonus: {
    label: "Referral bonus credited",
    group: "Account",
    subject: "Your referral bonus has been credited",
    heading: "Referral bonus credited",
    body:
      `Your referral bonus has been added to your account.\n\nBonus: [$0.00]\nReferred user: [name or masked email]\n\nThanks for growing the CTTTradezone community — your referral link is always available on your dashboard.\n\n${SIGNOFF}`,
    buttonLabel: "Open your dashboard",
    buttonUrl: "https://ctttradezone.com/wallet",
  },
  announcement: {
    label: "General account notice",
    group: "Other",
    subject: "A notice about your CTTTradezone account",
    heading: "A notice about your account",
    body:
      `We're writing with a short notice about your account.\n\n[Write the notice here.]\n\nIf anything is unclear, use the reply button below and our team will help.\n\n${SIGNOFF}`,
  },
};

const PRESET_GROUPS = ["Account", "Funds", "Plans", "Card", "Security", "Other"];


interface ComposerProps {
  users: AdminUser[];
  draft: MailDraft | null;
  userId: string | null;
  onSent: () => void;
  onDraftsChanged: () => void;
  onDraftConsumed: () => void;
}

export default function Composer({
  users,
  draft,
  userId,
  onSent,
  onDraftsChanged,
  onDraftConsumed,
}: ComposerProps) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dirty = useRef(false);

  // Load a draft the admin chose to continue.
  useEffect(() => {
    if (!draft) return;
    setDraftId(draft.id);
    setRecipient(draft.recipient_email ?? "");
    setRecipientName(draft.recipient_name ?? "");
    setSubject(draft.subject ?? "");
    setHeading(draft.heading ?? "");
    setBody(draft.body ?? "");
    setButtonLabel(draft.button_label ?? "");
    setButtonUrl(draft.button_url ?? "");
    dirty.current = false;
    onDraftConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const draftPayload = () => ({
    user_id: userId,
    recipient_email: recipient.trim() || null,
    recipient_name: recipientName.trim() || null,
    subject: subject.trim() || null,
    heading: heading.trim() || null,
    body: body || null,
    button_label: buttonLabel.trim() || null,
    button_url: buttonUrl.trim() || null,
  });

  const hasContent =
    [recipient, subject, heading, body, buttonLabel, buttonUrl].some(
      (v) => v.trim().length > 0
    );

  const saveDraft = async (silent = false) => {
    if (!userId || !hasContent) return;
    if (!silent) setSavingDraft(true);
    if (draftId) {
      await supabase.from("mail_drafts" as any).update(draftPayload() as any).eq("id", draftId);
    } else {
      const { data } = await supabase
        .from("mail_drafts" as any)
        .insert(draftPayload() as any)
        .select("id")
        .maybeSingle();
      if ((data as any)?.id) setDraftId((data as any).id);
    }
    dirty.current = false;
    if (!silent) {
      setSavingDraft(false);
      toast.success("Draft saved");
    }
    onDraftsChanged();
  };

  // Autosave while typing (debounced).
  useEffect(() => {
    if (!dirty.current || !hasContent) return;
    const t = setTimeout(() => saveDraft(true), 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient, recipientName, subject, heading, body, buttonLabel, buttonUrl]);

  const track = <T,>(setter: (v: T) => void) => (v: T) => {
    dirty.current = true;
    setter(v);
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    dirty.current = true;
    setSubject(preset.subject);
    setBody(preset.body);
    setHeading(preset.heading ?? "");
    setButtonLabel(preset.buttonLabel ?? "");
    setButtonUrl(preset.buttonUrl ?? "");
  };


  const previewHtml = useMemo(() => {
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  }, [body, heading, subject, recipientName, buttonLabel, buttonUrl]);

  const canSend =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim()) &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  const handleSend = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-send-email", {
      body: {
        recipientEmail: recipient.trim(),
        subject: subject.trim(),
        heading: heading.trim() || undefined,
        body: body.trim(),
        buttonLabel: buttonLabel.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        appOrigin: window.location.origin,
      },
    });
    setSending(false);
    setConfirmOpen(false);

    if (error || (data as any)?.error) {
      const msg = (data as any)?.error;
      toast.error(
        typeof msg === "string" ? msg : "Could not send the email. Please try again."
      );
      return;
    }

    if (draftId) {
      await supabase.from("mail_drafts" as any).delete().eq("id", draftId);
      setDraftId(null);
      onDraftsChanged();
    }

    toast.success(`Message queued for ${recipient.trim()}`);
    setBody("");
    setSubject("");
    setHeading("");
    setButtonLabel("");
    setButtonUrl("");
    dirty.current = false;
    onSent();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New message</CardTitle>
          <CardDescription>
            One recipient per send. Account and support notices only — no bulk or
            promotional mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Start from a template</Label>
            <Select onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a starting point" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {PRESET_GROUPS.map((group) => {
                  const items = Object.entries(PRESETS).filter(
                    ([, p]) => p.group === group
                  );
                  if (!items.length) return null;
                  return (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {items.map(([key, p]) => (
                        <SelectItem key={key} value={key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>

          </div>

          <div className="grid gap-2">
            <Label>Pick a registered user</Label>
            <Select
              onValueChange={(val) => {
                const u = users.find((x) => x.user_id === val);
                dirty.current = true;
                if (u?.email) setRecipient(u.email);
                if (u?.display_name) setRecipientName(u.display_name);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={users.length ? "Search users" : "Loading users…"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {users
                  .filter((u) => u.email)
                  .map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.display_name ? `${u.display_name} — ` : ""}
                      {u.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="recipient">Recipient email</Label>
              <Input
                id="recipient"
                type="email"
                maxLength={255}
                value={recipient}
                onChange={(e) => track(setRecipient)(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipientName">Recipient name (optional)</Label>
              <Input
                id="recipientName"
                maxLength={100}
                value={recipientName}
                onChange={(e) => track(setRecipientName)(e.target.value)}
                placeholder="Jeremy"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              maxLength={200}
              value={subject}
              onChange={(e) => track(setSubject)(e.target.value)}
              placeholder="Update on your account"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="heading">Heading in email (optional)</Label>
            <Input
              id="heading"
              maxLength={200}
              value={heading}
              onChange={(e) => track(setHeading)(e.target.value)}
              placeholder="Defaults to the subject"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              rows={10}
              maxLength={8000}
              value={body}
              onChange={(e) => track(setBody)(e.target.value)}
              placeholder="Write your message. Leave a blank line between paragraphs."
            />
            <p className="text-xs text-muted-foreground">{body.length}/8000 characters</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="buttonLabel">Button label (optional)</Label>
              <Input
                id="buttonLabel"
                maxLength={60}
                value={buttonLabel}
                onChange={(e) => track(setButtonLabel)(e.target.value)}
                placeholder="Open your dashboard"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="buttonUrl">Button link (optional)</Label>
              <Input
                id="buttonUrl"
                maxLength={500}
                value={buttonUrl}
                onChange={(e) => track(setButtonUrl)(e.target.value)}
                placeholder="https://ctttradezone.com/wallet"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              disabled={!canSend || sending}
              onClick={() => setConfirmOpen(true)}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send email
            </Button>
            <Button
              variant="outline"
              disabled={!hasContent || savingDraft}
              onClick={() => saveDraft(false)}
            >
              {savingDraft ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Exactly what the user receives.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <iframe title="Email preview" srcDoc={previewHtml} className="h-[560px] w-full" />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send this email?</AlertDialogTitle>
            <AlertDialogDescription>
              To: <span className="font-medium">{recipient}</span>
              <br />
              Subject: <span className="font-medium">{subject}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={sending}>
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
