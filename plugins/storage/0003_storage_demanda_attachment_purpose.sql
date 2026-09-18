-- plugins/storage/0003_storage_demanda_attachment_purpose.sql
-- Adds 'demanda_attachment' to `files.purpose`'s CHECK constraint — the demanda create flow's
-- attachment step (`ImageGalleryManager` reused in `readOnly`/mixed mode, see
-- foco-total/src/components/demandas/criar-demanda-button.tsx) uploads with
-- `purpose="demanda_attachment"`. Same idempotent DROP + re-CREATE pattern as
-- 0002_storage_service_image_purpose.sql.

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_purpose_check;

ALTER TABLE public.files ADD CONSTRAINT files_purpose_check CHECK (purpose IN (
  'ad_image', 'service_image', 'demanda_attachment', 'avatar', 'document', 'banner', 'pdf', 'doc', 'other'
));

INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
