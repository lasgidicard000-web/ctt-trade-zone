CREATE TABLE public.mail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  participant_email text NOT NULL,
  participant_name text,
  status text NOT NULL DEFAULT 'open',
  unread_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mail_threads TO authenticated;
GRANT ALL ON public.mail_threads TO service_role;
ALTER TABLE public.mail_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view threads" ON public.mail_threads
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create threads" ON public.mail_threads
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update threads" ON public.mail_threads
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mail_threads_updated_at BEFORE UPDATE ON public.mail_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.mail_threads(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  sender_email text,
  sender_name text,
  heading text,
  body text NOT NULL,
  button_label text,
  button_url text,
  message_id text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mail_messages_thread_idx ON public.mail_messages(thread_id, created_at);

GRANT SELECT, INSERT ON public.mail_messages TO authenticated;
GRANT ALL ON public.mail_messages TO service_role;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mail messages" ON public.mail_messages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert mail messages" ON public.mail_messages
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mail_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_email text,
  recipient_name text,
  subject text,
  heading text,
  body text,
  button_label text,
  button_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_drafts TO authenticated;
GRANT ALL ON public.mail_drafts TO service_role;
ALTER TABLE public.mail_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their own drafts" ON public.mail_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mail_drafts_updated_at BEFORE UPDATE ON public.mail_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mail_reply_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  thread_id uuid NOT NULL REFERENCES public.mail_threads(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.mail_messages(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mail_reply_tokens TO authenticated;
GRANT ALL ON public.mail_reply_tokens TO service_role;
ALTER TABLE public.mail_reply_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reply tokens" ON public.mail_reply_tokens
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.mail_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mail_threads;