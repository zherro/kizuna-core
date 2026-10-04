-- plugins/storage/0006_storage_optimize_admin.sql
-- Tela de storage do root (`/painel/root/storage`): lista as imagens e reotimiza as existentes no
-- próprio registro (mesmo `id`), gerando a miniatura de 0005.
--
-- 1) `optimized_at`: quando a imagem passou pelo otimizador (upload novo ou reotimização). `NULL`
--    = pendente — é o filtro "não otimizadas" da tela. Imagens gravadas fora do upload (ex.:
--    importação por robô direto no banco) nascem pendentes.
-- 2) `service_role` (sql/0117, BYPASSRLS): o servidor lê e regrava arquivos de qualquer dono só
--    nessa operação de root — a sessão do root não passa na policy de UPDATE (dono do arquivo).

ALTER TABLE public.files ADD COLUMN IF NOT EXISTS optimized_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_files_pending_optimize ON public.files(created_at)
  WHERE optimized_at IS NULL AND active;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, UPDATE ON TABLE public.files TO service_role;
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.5.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
