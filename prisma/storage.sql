-- Supabase Storage setup for uploaded source files. Safe to run more than once.
-- Run with: pnpm db:storage
-- Kept out of prisma/migrations because the `storage` schema only exists on Supabase,
-- not on the shadow database that `prisma migrate dev` replays migrations against.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-files',
  'note-files',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Users may only READ objects under a top-level folder named after their own user id.
-- There is deliberately no insert or delete policy: uploads happen only through signed upload
-- targets issued by the app server (service role), which is how the app enforces file counts,
-- sizes and the per-user storage quota.
DROP POLICY IF EXISTS "note-files: owner can read" ON storage.objects;
CREATE POLICY "note-files: owner can read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'note-files' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "note-files: owner can upload" ON storage.objects;
DROP POLICY IF EXISTS "note-files: owner can delete" ON storage.objects;
