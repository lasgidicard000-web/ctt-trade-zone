CREATE POLICY "Users can view their own avatar" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

UPDATE public.profiles
SET avatar_url = '/__l5e/assets-v1/0065413f-0459-46f7-acc5-7c5190e726ee/jeremy-avatar.png'
WHERE user_id = 'b12f35e2-9d19-4fb9-b572-a3c8d9dbc4c5';