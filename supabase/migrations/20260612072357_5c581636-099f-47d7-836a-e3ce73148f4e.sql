CREATE POLICY "Users can update their own fit-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fit-files' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'fit-files' AND auth.uid()::text = (storage.foldername(name))[1]);