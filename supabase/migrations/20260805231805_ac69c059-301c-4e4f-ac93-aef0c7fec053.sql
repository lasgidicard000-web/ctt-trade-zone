CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read app settings" ON public.app_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert app settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update app settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings(key, value)
VALUES ('card_pin_policy', jsonb_build_object('mode', 'per_card', 'global_pin_hash', NULL));

-- Admin: read policy (no secrets returned)
CREATE OR REPLACE FUNCTION public.admin_get_card_pin_policy()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _v jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT value INTO _v FROM public.app_settings WHERE key = 'card_pin_policy';
  RETURN jsonb_build_object(
    'mode', COALESCE(_v->>'mode', 'per_card'),
    'has_global_pin', (_v->>'global_pin_hash') IS NOT NULL
  );
END;
$$;

-- Admin: set mode and/or global PIN
CREATE OR REPLACE FUNCTION public.admin_set_card_pin_policy(_mode text, _global_pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _v jsonb; _hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _mode NOT IN ('per_card','global') THEN
    RAISE EXCEPTION 'invalid mode';
  END IF;

  SELECT value INTO _v FROM public.app_settings WHERE key = 'card_pin_policy';
  _v := COALESCE(_v, '{}'::jsonb);
  _hash := _v->>'global_pin_hash';

  IF _global_pin IS NOT NULL AND _global_pin <> '' THEN
    IF _global_pin !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'PIN must be 4 digits'; END IF;
    _hash := extensions.crypt(_global_pin, extensions.gen_salt('bf'));
  END IF;

  IF _mode = 'global' AND _hash IS NULL THEN
    RAISE EXCEPTION 'set a global PIN before enabling global mode';
  END IF;

  UPDATE public.app_settings
  SET value = jsonb_build_object('mode', _mode, 'global_pin_hash', _hash)
  WHERE key = 'card_pin_policy';

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, before, after, reason)
  VALUES (auth.uid(), 'card-pin-policy', 'app_settings',
    jsonb_build_object('mode', _v->>'mode', 'has_global_pin', (_v->>'global_pin_hash') IS NOT NULL),
    jsonb_build_object('mode', _mode, 'has_global_pin', _hash IS NOT NULL),
    CASE WHEN _global_pin IS NOT NULL AND _global_pin <> '' THEN 'global PIN updated' ELSE 'mode changed' END);

  RETURN jsonb_build_object('ok', true, 'mode', _mode, 'has_global_pin', _hash IS NOT NULL);
END;
$$;

-- Admin: set or revoke a single card PIN
CREATE OR REPLACE FUNCTION public.admin_set_card_pin(_card_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _c public.virtual_cards; _hash text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id;
  IF _c.id IS NULL THEN RAISE EXCEPTION 'card not found'; END IF;

  IF _pin IS NULL OR _pin = '' THEN
    _hash := NULL;
  ELSIF _pin ~ '^[0-9]{4}$' THEN
    _hash := extensions.crypt(_pin, extensions.gen_salt('bf'));
  ELSE
    RAISE EXCEPTION 'PIN must be 4 digits';
  END IF;

  UPDATE public.virtual_cards SET pin_hash = _hash WHERE id = _card_id;

  DELETE FROM public.card_reveal_attempts WHERE card_id = _card_id AND success = false;

  INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
  VALUES (_c.user_id, _card_id, CASE WHEN _hash IS NULL THEN 'admin_pin_revoke' ELSE 'admin_pin_set' END,
          true, 'performed by admin');

  INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_id, target_user_id, before, after, reason)
  VALUES (auth.uid(), CASE WHEN _hash IS NULL THEN 'card-pin-revoke' ELSE 'card-pin-set' END,
          'virtual_cards', _card_id, _c.user_id,
          jsonb_build_object('has_pin', _c.pin_hash IS NOT NULL),
          jsonb_build_object('has_pin', _hash IS NOT NULL), NULL);

  RETURN jsonb_build_object('ok', true, 'has_pin', _hash IS NOT NULL);
END;
$$;

-- Unlock honours the global PIN when global mode is active
CREATE OR REPLACE FUNCTION public.get_card_details(_card_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _c public.virtual_cards;
  _fails integer;
  _last_fail timestamptz;
  _policy jsonb;
  _mode text;
  _expected text;
BEGIN
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id;
  IF _c.id IS NULL OR _c.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT value INTO _policy FROM public.app_settings WHERE key = 'card_pin_policy';
  _mode := COALESCE(_policy->>'mode', 'per_card');
  IF _mode = 'global' THEN
    _expected := _policy->>'global_pin_hash';
  ELSE
    _expected := _c.pin_hash;
  END IF;

  IF _expected IS NULL THEN
    RAISE EXCEPTION 'no_pin';
  END IF;

  SELECT count(*), max(created_at) INTO _fails, _last_fail
  FROM public.card_reveal_attempts
  WHERE user_id = auth.uid()
    AND card_id = _card_id
    AND success = false
    AND created_at > now() - interval '15 minutes';

  IF _fails >= 5 THEN
    INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
    VALUES (auth.uid(), _card_id, 'pin_unlock', false, 'locked out (too many attempts)');
    RAISE EXCEPTION 'locked_until:%', to_char(_last_fail + interval '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SSOF');
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$'
     OR _expected <> extensions.crypt(_pin, _expected) THEN
    INSERT INTO public.card_reveal_attempts (user_id, card_id, success)
    VALUES (auth.uid(), _card_id, false);
    INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
    VALUES (auth.uid(), _card_id, 'pin_unlock', false, 'incorrect PIN');
    RAISE EXCEPTION 'invalid_pin';
  END IF;

  INSERT INTO public.card_reveal_attempts (user_id, card_id, success)
  VALUES (auth.uid(), _card_id, true);

  DELETE FROM public.card_reveal_attempts
  WHERE user_id = auth.uid() AND card_id = _card_id AND success = false;

  INSERT INTO public.card_security_events(user_id, card_id, action, success, detail)
  VALUES (auth.uid(), _card_id, 'pin_unlock', true, 'card number, expiry and CVV revealed');

  RETURN jsonb_build_object(
    'card_number', _c.card_number,
    'cvv', _c.cvv,
    'expiry_month', _c.expiry_month,
    'expiry_year', _c.expiry_year
  );
END;
$$;