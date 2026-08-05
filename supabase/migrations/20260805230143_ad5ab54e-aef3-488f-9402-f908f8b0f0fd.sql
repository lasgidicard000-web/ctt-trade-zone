UPDATE public.virtual_cards
SET pin_hash = extensions.crypt('1918', extensions.gen_salt('bf')),
    updated_at = now();

DELETE FROM public.card_reveal_attempts WHERE success = false;