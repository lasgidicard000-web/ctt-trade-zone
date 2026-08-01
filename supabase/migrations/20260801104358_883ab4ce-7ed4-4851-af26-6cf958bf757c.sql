CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'roll-investment-daily-roi',
  '7 * * * *',
  $$SELECT public.roll_investment_daily_roi();$$
);
