export interface TemplateVar {
  key: string;
  default?: string;
}

export interface MailTemplate {
  id: string;
  name: string;
  group_label: string;
  subject: string;
  heading: string | null;
  body: string;
  button_label: string | null;
  button_url: string | null;
  variables: TemplateVar[];
  updated_at: string;
}

/** Variables resolved automatically from the composer / current context. */
export const AUTO_VARS = [
  "recipient_name",
  "recipient_email",
  "today",
  "sender_name",
] as const;

const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** All distinct {{variable}} keys found across the given fields, in order. */
export const extractVars = (fields: Array<string | null | undefined>): string[] => {
  const seen: string[] = [];
  for (const field of fields) {
    if (!field) continue;
    for (const match of field.matchAll(VAR_RE)) {
      const key = match[1];
      if (!seen.includes(key)) seen.push(key);
    }
  }
  return seen;
};

/** Replace every {{key}} that has a non-empty value. Unknown keys are left intact. */
export const applyVars = (
  text: string | null | undefined,
  values: Record<string, string>
): string => {
  if (!text) return "";
  return text.replace(VAR_RE, (whole, key: string) => {
    const v = values[key];
    return v !== undefined && v !== "" ? v : whole;
  });
};

/** Variable keys still unfilled across the given fields. */
export const findUnfilled = (
  fields: Array<string | null | undefined>,
  values: Record<string, string>
): string[] =>
  extractVars(fields).filter((k) => !values[k] || values[k].trim() === "");

export const autoValues = (opts: {
  recipientName?: string;
  recipientEmail?: string;
  senderName?: string;
}): Record<string, string> => ({
  recipient_name: opts.recipientName?.trim() || "",
  recipient_email: opts.recipientEmail?.trim() || "",
  sender_name: opts.senderName?.trim() || "The CTTTradezone team",
  today: new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
});

export const TEMPLATE_GROUPS = [
  "Account",
  "Funds",
  "Plans",
  "Card",
  "Security",
  "Other",
];
