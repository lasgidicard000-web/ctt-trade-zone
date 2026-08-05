-- 1. Card security events
CREATE TABLE public.card_security_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  action text NOT NULL,
  success boolean NOT NULL DEFAULT true,
  detail text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX card_security_events_card_idx ON public.card_security_events(card_id, created_at DESC);

GRANT SELECT ON public.card_security_events TO authenticated;
GRANT ALL ON public.card_security_events TO service_role;

ALTER TABLE public.card_security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_security_events_owner_select"
ON public.card_security_events FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_card_event(
  _card_id uuid,
  _action text,
  _success boolean DEFAULT true,
  _detail text DEFAULT NULL,
  _user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _owner uuid;
BEGIN
  IF _action IS NULL OR length(_action) > 60 THEN
    RAISE EXCEPTION 'invalid action';
  END IF;
  SELECT user_id INTO _owner FROM public.virtual_cards WHERE id = _card_id;
  IF _owner IS NULL OR _owner <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.card_security_events(user_id, card_id, action, success, detail, user_agent)
  VALUES (_owner, _card_id, _action, COALESCE(_success, true), left(_detail, 200), left(_user_agent, 200));
END;
$$;

-- 2. get_card_details logs unlock outcomes
CREATE OR REPLACE FUNCTION public.get_card_details(_card_id uuid, _pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _c public.virtual_cards;
  _fails integer;
  _last_fail timestamptz;
BEGIN
  SELECT * INTO _c FROM public.virtual_cards WHERE id = _card_id;
  IF _c.id IS NULL OR _c.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _c.pin_hash IS NULL THEN
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
     OR _c.pin_hash <> extensions.crypt(_pin, _c.pin_hash) THEN
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
$function$;

-- 3. Referral clicks
CREATE TABLE public.referral_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referral_code text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX referral_clicks_referrer_idx ON public.referral_clicks(referrer_id, created_at DESC);

GRANT SELECT ON public.referral_clicks TO authenticated;
GRANT ALL ON public.referral_clicks TO service_role;

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_clicks_owner_select"
ON public.referral_clicks FOR SELECT TO authenticated
USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.record_referral_click(_ref text, _source text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid;
BEGIN
  IF _ref IS NULL OR _ref !~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN;
  END IF;
  _uid := _ref::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid) THEN
    RETURN;
  END IF;
  INSERT INTO public.referral_clicks(referrer_id, referral_code, source)
  VALUES (_uid, _ref, left(_source, 40));
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_referral_click(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS TABLE(clicks integer, signups integer, rewards_total numeric, rewards_pending integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COALESCE((SELECT count(*)::int FROM public.referral_clicks WHERE referrer_id = auth.uid()), 0),
    COALESCE((SELECT count(*)::int FROM public.referrals WHERE referrer_id = auth.uid()), 0),
    COALESCE((SELECT sum(amount) FROM public.rewards_history
              WHERE user_id = auth.uid() AND reward_type = 'referral'), 0),
    COALESCE((SELECT count(*)::int FROM public.referrals
              WHERE referrer_id = auth.uid() AND reward_claimed = false), 0)
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO authenticated;

-- 4. Security fix: drop unrestricted upload policy on private screenshots bucket
DROP POLICY IF EXISTS "Authenticated users can upload screenshots" ON storage.objects;