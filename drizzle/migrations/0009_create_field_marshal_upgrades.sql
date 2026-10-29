CREATE TABLE public.field_marshal_upgrades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric NOT NULL DEFAULT 500,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  btc_amount numeric,
  note text,
  admin_note text,
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX field_marshal_upgrades_active_once
  ON public.field_marshal_upgrades (user_id)
  WHERE status IN ('pending','confirmed');

GRANT SELECT, INSERT ON public.field_marshal_upgrades TO authenticated;
GRANT ALL ON public.field_marshal_upgrades TO service_role;

ALTER TABLE public.field_marshal_upgrades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own upgrade request"
  ON public.field_marshal_upgrades FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can submit own upgrade request"
  ON public.field_marshal_upgrades FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can decide upgrade requests"
  ON public.field_marshal_upgrades FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_field_marshal_upgrades_updated_at
  BEFORE UPDATE ON public.field_marshal_upgrades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();