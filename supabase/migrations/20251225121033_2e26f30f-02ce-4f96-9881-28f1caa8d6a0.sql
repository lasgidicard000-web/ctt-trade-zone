-- Create storage bucket for gift card screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('gift-card-screenshots', 'gift-card-screenshots', true);

-- Allow authenticated users to upload screenshots
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gift-card-screenshots');

-- Allow public access to view screenshots
CREATE POLICY "Anyone can view gift card screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gift-card-screenshots');