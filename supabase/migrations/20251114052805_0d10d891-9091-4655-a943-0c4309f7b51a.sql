-- Enable realtime for transaction-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals;