-- plugins/services/0016_services_occurs_at.sql
-- `services.occurs_at`: QUANDO o anúncio acontece (evento: data/hora de início). Genérico — vale
-- para qualquer categoria que tenha data (show, feira, curso…); NULL = sem data. Existe para
-- ORDENAR e filtrar por data com índice, sem abrir o JSON do formulário a cada busca
-- (`fn_search_services` `p_order => 'occurs_at'`, plugin search 0011).
--
-- Fonte: quem grava o anúncio pode preencher direto (importador/robô). Além disso, o trigger em
-- `form_results` (plugin forms) copia a resposta de data do formulário do anúncio — a primeira
-- chave preenchida de `answers` entre `data_inicio`, `data_evento`, `data` — para `occurs_at`.
-- Data sem fuso (`2026-10-25T19:00`, campo datetime do form) é lida no horário de Brasília.
-- Texto que não é data é ignorado (não derruba o save do formulário).
-- Idempotente.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS occurs_at timestamptz NULL;

COMMENT ON COLUMN public.services.occurs_at IS
  'Quando o anúncio acontece (evento: início). NULL = sem data. Ordenação/agenda; sincronizado de form_results.answers.data_inicio.';

-- Só anúncios publicados com data: é o recorte que a busca ordena.
CREATE INDEX IF NOT EXISTS services_occurs_at
  ON public.services (occurs_at)
  WHERE active AND status = 'active' AND occurs_at IS NOT NULL;

-- Texto de data (ISO, com ou sem fuso) → timestamptz; inválido/vazio → NULL.
CREATE OR REPLACE FUNCTION public.fn_parse_occurs_at(p_value text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $function$
DECLARE
  v text := NULLIF(btrim(p_value), '');
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;
  -- com fuso explícito (Z ou ±hh:mm) vale como veio; sem fuso = horário de Brasília
  -- (o fuso só conta depois da hora: '2026-10-25' termina em '-25', que não é fuso)
  IF v ~ '[T ]\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$' THEN
    RETURN v::timestamptz;
  END IF;
  RETURN (v::timestamp) AT TIME ZONE 'America/Sao_Paulo';
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$function$;

DO $do$
BEGIN
  -- O sincronismo depende do plugin forms (vem antes de services na lista); sem ele, só a coluna.
  IF to_regclass('public.form_results') IS NULL THEN
    RETURN;
  END IF;

  CREATE OR REPLACE FUNCTION public.fn_form_results_sync_occurs_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $function$
  DECLARE
    v_at timestamptz;
  BEGIN
    IF NEW.domain <> 'service' OR NEW.reference_id IS NULL OR NEW.reference_id !~ '^\d+$' THEN
      RETURN NEW;
    END IF;
    v_at := public.fn_parse_occurs_at(
      COALESCE(
        NULLIF(NEW.answers->>'data_inicio', ''),
        NULLIF(NEW.answers->>'data_evento', ''),
        NULLIF(NEW.answers->>'data', '')
      )
    );
    UPDATE public.services s
       SET occurs_at = v_at
     WHERE s.id = NEW.reference_id::bigint
       AND s.occurs_at IS DISTINCT FROM v_at;
    RETURN NEW;
  END;
  $function$;

  DROP TRIGGER IF EXISTS trg_form_results_sync_occurs_at ON public.form_results;
  CREATE TRIGGER trg_form_results_sync_occurs_at
    AFTER INSERT OR UPDATE OF answers, reference_id, domain ON public.form_results
    FOR EACH ROW EXECUTE FUNCTION public.fn_form_results_sync_occurs_at();

  -- Backfill dos anúncios que já têm formulário com data.
  UPDATE public.services s
     SET occurs_at = x.at
    FROM (
      SELECT DISTINCT ON (fr.reference_id)
             fr.reference_id::bigint AS service_id,
             public.fn_parse_occurs_at(
               COALESCE(
                 NULLIF(fr.answers->>'data_inicio', ''),
                 NULLIF(fr.answers->>'data_evento', ''),
                 NULLIF(fr.answers->>'data', '')
               )
             ) AS at
        FROM public.form_results fr
       WHERE fr.domain = 'service'
         AND fr.reference_id ~ '^\d+$'
       ORDER BY fr.reference_id, fr.id DESC
    ) x
   WHERE s.id = x.service_id
     AND x.at IS NOT NULL
     AND s.occurs_at IS DISTINCT FROM x.at;
END;
$do$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.10.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
