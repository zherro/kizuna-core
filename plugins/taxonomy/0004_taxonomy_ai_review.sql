-- plugins/taxonomy/0004_taxonomy_ai_review.sql
-- Flag por categoria para o plugin ai_review: quando true, os textos dos anúncios da categoria
-- entram na revisão por IA. Só a coluna; a lógica vive em plugins/ai_review. Idempotente.
-- Escrita já coberta pela UPDATE policy de categories (categorias.manage).

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS ai_review boolean NOT NULL DEFAULT false;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('taxonomy', '1.5.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
