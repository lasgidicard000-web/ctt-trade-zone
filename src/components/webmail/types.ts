export interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
}

export interface MailThread {
  id: string;
  subject: string;
  participant_email: string;
  participant_name: string | null;
  status: string;
  unread_count: number;
  last_message_at: string;
  created_at: string;
}

export interface MailMessage {
  id: string;
  thread_id: string;
  direction: "inbound" | "outbound";
  sender_email: string | null;
  sender_name: string | null;
  heading: string | null;
  body: string;
  button_label: string | null;
  button_url: string | null;
  message_id: string | null;
  created_at: string;
}

export interface MailDraft {
  id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string | null;
  heading: string | null;
  body: string | null;
  button_label: string | null;
  button_url: string | null;
  updated_at: string;
}

export interface LogRow {
  id: string;
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export const statusClass = (status: string) => {
  switch (status) {
    case "sent":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "suppressed":
      return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
    default:
      return "bg-destructive/15 text-destructive border-destructive/30";
  }
};
