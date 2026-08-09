CREATE TABLE public.mail_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  group_label text NOT NULL DEFAULT 'Other',
  subject text NOT NULL DEFAULT '',
  heading text,
  body text NOT NULL DEFAULT '',
  button_label text,
  button_url text,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_templates TO authenticated;
GRANT ALL ON public.mail_templates TO service_role;

ALTER TABLE public.mail_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mail templates" ON public.mail_templates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create mail templates" ON public.mail_templates
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update mail templates" ON public.mail_templates
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete mail templates" ON public.mail_templates
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_mail_templates_updated_at
  BEFORE UPDATE ON public.mail_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();