ALTER TABLE public.coin_prices
  ADD COLUMN IF NOT EXISTS price_source text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_by uuid;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'update-coin-prices') THEN
    PERFORM cron.unschedule('update-coin-prices');
  END IF;
END $$;

SELECT cron.schedule(
  'update-coin-prices',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cbezdlqbpebedvpkehjh.supabase.co/functions/v1/update-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZXpkbHFicGViZWR2cGtlaGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNzY3NTIsImV4cCI6MjA3ODY1Mjc1Mn0.kBW3Qsa2VP70zLcNsDY6tPFJBBCnPWFcWUJ81SuYNk4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);