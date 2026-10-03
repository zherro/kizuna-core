-- plugins/storage/0004_storage_ticket_attachment_purpose.sql
-- Adds 'ticket_attachment' to `files.purpose`'s CHECK constraint — imagens anexadas a chamados
-- (plugin tickets: abertura do chamado, comentários do usuário e respostas da equipe). Mesmo padrão
-- idempotente DROP + re-CREATE de 0002/0003.

ALTER TABLE public.files DROP CONSTRAINT IF EXISTS files_purpose_check;

ALTER TABLE public.files ADD CONSTRAINT files_purpose_check CHECK (purpose IN (
  'ad_image', 'service_image', 'demanda_attachment', 'ticket_attachment', 'avatar', 'document', 'banner', 'pdf', 'doc', 'other'
));

INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.3.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
