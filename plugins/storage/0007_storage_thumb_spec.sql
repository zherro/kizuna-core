-- plugins/storage/0007_storage_thumb_spec.sql
-- Marca de qual medida gerou cada miniatura (`files.thumb_content`, 0005):
--   `thumb_spec` = `<lado>q<qualidade>` do preset usado (ex.: `360q60`; presets em
--   `src/shared/image/thumb-presets.json`, escolhidos em kizuna.config.json → images.thumbPreset);
--   `thumb_at`   = quando a miniatura foi gerada.
-- Serve para NÃO reprocessar o que já está na medida configurada e para achar o que ficou
-- desatualizado depois de trocar o preset (scripts/regerar-miniaturas.mjs --conferir).
-- Miniaturas anteriores a esta migration ficam com `thumb_spec NULL` ("sem marca": a medida é
-- desconhecida) e são refeitas uma vez pelo script.
--
-- Só colunas nulas, sem DEFAULT e sem reescrever a tabela: instantâneo, idempotente e reversível
-- (ALTER TABLE public.files DROP COLUMN thumb_spec, DROP COLUMN thumb_at). Aplique ANTES de subir o
-- código que grava as colunas (o upload tolera a ausência, mas o script e os importadores exigem).

ALTER TABLE public.files ADD COLUMN IF NOT EXISTS thumb_spec text;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS thumb_at timestamptz;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.6.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
