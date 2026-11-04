-- 0013_storage.sql
-- Phase 2 Database: Storage Buckets & Access Security Policies

BEGIN;

-- 1. Create Media & Report Buckets in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('car-media', 'car-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  ('inspection-reports', 'inspection-reports', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('trade-in-photos', 'trade-in-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Storage Policies on storage.objects

-- Car Media: Anyone can view public car media; Administrators can manage assets
DROP POLICY IF EXISTS "Public can view car media" ON storage.objects;
CREATE POLICY "Public can view car media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'car-media');

DROP POLICY IF EXISTS "Admin can manage car media" ON storage.objects;
CREATE POLICY "Admin can manage car media"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'car-media' AND private.is_admin())
  WITH CHECK (bucket_id = 'car-media' AND private.is_admin());

-- Inspection Reports: Authenticated buyers & staff can view signed reports; Managers and Administrators can upload
DROP POLICY IF EXISTS "Authenticated users view inspection reports" ON storage.objects;
CREATE POLICY "Authenticated users view inspection reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inspection-reports');

DROP POLICY IF EXISTS "Admin manage inspection reports" ON storage.objects;
DROP POLICY IF EXISTS "Managers and Admin manage inspection reports" ON storage.objects;
CREATE POLICY "Managers and Admin manage inspection reports"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'inspection-reports' AND (private.is_manager() OR private.is_admin()))
  WITH CHECK (bucket_id = 'inspection-reports' AND (private.is_manager() OR private.is_admin()));

-- Trade-In Photos: Users manage files only within their own folder (<user_id>/...); Authorized staff can view
DROP POLICY IF EXISTS "Users manage own trade in photos" ON storage.objects;
CREATE POLICY "Users manage own trade in photos"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'trade-in-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'trade-in-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff view trade in photos" ON storage.objects;
CREATE POLICY "Staff view trade in photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'trade-in-photos'
    AND private.is_staff()
  );

COMMIT;
