-- plugins/services/0004_services_expires_at.sql
-- Validade do anúncio: `services.expires_at` (NULL = sem validade). Passado o instante, o anúncio
-- some da busca/swipe (filtro em fn_search_services, search 0002); `status` continua 'active'.
-- Idempotente. GRANTs/policies de `services` são por tabela (0001) e cobrem a coluna nova.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

COMMENT ON COLUMN public.services.expires_at IS
  'Fim da validade do anúncio (timestamptz). NULL = sem validade. Vencido: some da busca/swipe (status segue active).';

CREATE INDEX IF NOT EXISTS services_expires_at
  ON public.services (expires_at) WHERE active AND expires_at IS NOT NULL;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.3.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
