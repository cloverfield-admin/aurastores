INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can upload onboarding documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload onboarding documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'compliance-documents');

DROP POLICY IF EXISTS "Authenticated users can read onboarding documents" ON storage.objects;
CREATE POLICY "Authenticated users can read onboarding documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'compliance-documents');

DROP POLICY IF EXISTS "Authenticated users can update onboarding documents" ON storage.objects;
CREATE POLICY "Authenticated users can update onboarding documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'compliance-documents')
WITH CHECK (bucket_id = 'compliance-documents');
