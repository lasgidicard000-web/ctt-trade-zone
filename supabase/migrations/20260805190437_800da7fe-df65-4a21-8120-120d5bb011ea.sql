CREATE TABLE IF NOT EXISTS public.card_reveal_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  success boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_reveal_attempts TO authenticated;
GRANT ALL ON public.card_reveal_attempts TO service_role;

ALTER TABLE public.card_reveal_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reveal attempts"
ON public.card_reveal_attempts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS card_reveal_attempts_user_created_idx
ON public.card_reveal_attempts (user_id, created_at DESC);

DROP FUNCTION IF EXISTS public.get_card_details(uuid);

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
    RAISE EXCEPTION 'locked_until:%', to_char(_last_fail + interval '15 minutes', 'YYYY-MM-DD"T"HH24:MI:SSOF');
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{4}$'
     OR _c.pin_hash <> extensions.crypt(_pin, _c.pin_hash) THEN
    INSERT INTO public.card_reveal_attempts (user_id, card_id, success)
    VALUES (auth.uid(), _card_id, false);
    RAISE EXCEPTION 'invalid_pin';
  END IF;

  INSERT INTO public.card_reveal_attempts (user_id, card_id, success)
  VALUES (auth.uid(), _card_id, true);

  DELETE FROM public.card_reveal_attempts
  WHERE user_id = auth.uid() AND card_id = _card_id AND success = false;

  RETURN jsonb_build_object(
    'card_number', _c.card_number,
    'cvv', _c.cvv,
    'expiry_month', _c.expiry_month,
    'expiry_year', _c.expiry_year
  );
END;
$function$;

DROP POLICY IF EXISTS "Users can insert their own milestones" ON public.user_milestones;
DROP POLICY IF EXISTS "Users can create their own milestone progress" ON public.user_milestones;

CREATE POLICY "Users can create their own milestone progress"
ON public.user_milestones FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND completed = false
  AND reward_claimed = false
  AND current_progress = 0
);