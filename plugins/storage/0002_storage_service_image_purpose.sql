-- plugins/storage/0002_storage_service_image_purpose.sql
-- Adds 'service_image' to `files.purpose`'s CHECK constraint. The `services` wizard's image step
-- (`client/components/services/wizard-steps/step-images.tsx`) has uploaded with
-- `purpose="service_image"` since the service wizard shipped, but `0001_storage.sql`'s CHECK never
-- included it (only `ad_image` from the older `ads`-based flow) — every upload from that step has
-- been failing at the DB layer with `violates check constraint "files_purpose_check"` on any
-- database still running the 0001 constraint. Found while seeding service images directly against
-- `public.files` (a plain INSERT with `purpose = 'service_image'` reproduces the 42... check
-- violation immediately).
--
-- Idempotent: DROP + re-CREATE the same-named constraint is safe to re-run (Postgres has no
-- `ADD CONSTRAINT IF NOT EXISTS`, so DROP IF EXISTS + CREATE is the standard idempotent pattern
-- for constraints in this codebase).

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_purpose_check;

ALTER TABLE public.files ADD CONSTRAINT files_purpose_check CHECK (purpose IN (
  'ad_image', 'service_image', 'avatar', 'document', 'banner', 'pdf', 'doc', 'other'
));

INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
