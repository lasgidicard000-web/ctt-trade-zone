DROP POLICY IF EXISTS "Authenticated users can view plan entitlements" ON public.plan_entitlements;
DROP POLICY IF EXISTS "Admins can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Admins can view plan entitlements" ON public.plan_entitlements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.field_marshal_gas_ledger(user_id, amount_usd, entry_type, status, transaction_hash, note)
SELECT 'b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5', 300, 'deposit', 'confirmed', 'fdd4cd14ab3a4baeca65303df0e335018dde90b517356b502aa297326af20d0c', 'TRON gas fee paid — 942.565823 TRX verified on-chain (≈ $300)'
WHERE NOT EXISTS (SELECT 1 FROM public.field_marshal_gas_ledger WHERE transaction_hash = 'fdd4cd14ab3a4baeca65303df0e335018dde90b517356b502aa297326af20d0c');

INSERT INTO public.field_marshal_gas_balances(user_id, balance_usd)
SELECT 'b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5', 300
WHERE NOT EXISTS (SELECT 1 FROM public.field_marshal_gas_balances WHERE user_id = 'b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5');

INSERT INTO public.transactions(user_id, type, from_symbol, to_symbol, amount, status, notes)
SELECT 'b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5', 'deposit', 'TRX', 'TRX', 942.565823, 'completed', 'TRON gas fee paid — $300 credited to Field Marshal gas balance. Tx fdd4cd14ab3a4baeca65303df0e335018dde90b517356b502aa297326af20d0c'
WHERE NOT EXISTS (SELECT 1 FROM public.transactions WHERE notes LIKE '%fdd4cd14ab3a4baeca65303df0e335018dde90b517356b502aa297326af20d0c%');

INSERT INTO public.admin_transaction_log(admin_user_id, action, target_table, target_user_id, after, reason)
VALUES ('078e6ca9-4150-4dba-9b98-04c56cd3939c', 'credit-gas', 'field_marshal_gas_ledger', 'b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5', '{"amount_usd":300}', 'Verified TRON gas deposit');