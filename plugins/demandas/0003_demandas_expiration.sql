-- plugins/demandas/0003_demandas_expiration.sql
-- Expiração automática de demanda `aberta` esquecida (sem prestador respondendo). Guardada como
-- data (`expires_at`), não como job/cron — nada neste projeto roda jobs em background. O prazo em
-- dias é uma env do APP (`DEMANDA_EXPIRATION_DAYS`, foco-total/.env), não do plugin — o cliente
-- não define isso, o servidor calcula `expires_at` na criação (ver
-- foco-total/src/app/api/demandas/route.ts) e manda pronto pra `fn_demanda_create` via
-- `p_expires_at`. `fn_demanda_create` mantém um fallback de 30 dias caso `p_expires_at` não seja
-- informado (chamada direta via RPC genérica, sem passar pela rota dedicada).
--
-- "Expirada" ainda não é um status novo em `demanda.status` — checar/marcar como expirada
-- (`status = 'aberta' AND expires_at < now()`) fica pra quando alguém consumir isso (listagem,
-- fechamento automático). Este migration só guarda a data.

ALTER TABLE public.demanda ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DROP FUNCTION IF EXISTS public.fn_demanda_create(bigint, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.fn_demanda_create(
  p_category_id     bigint,
  p_form_answers    jsonb DEFAULT '{}'::jsonb,
  p_attachment_ids  jsonb DEFAULT '[]'::jsonb,
  p_expires_at      timestamptz DEFAULT NULL
) RETURNS public.demanda
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  v_demanda  public.demanda;
  v_form_key text;
BEGIN
  IF p_category_id IS NULL THEN
    RAISE EXCEPTION 'categoria obrigatória' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id = p_category_id AND active) THEN
    RAISE EXCEPTION 'categoria inválida' USING errcode = '22023';
  END IF;
  IF jsonb_typeof(coalesce(p_attachment_ids, 'null'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_attachment_ids deve ser um array' USING errcode = '22023';
  END IF;

  INSERT INTO public.demanda (category_id, attachments, expires_at)
  VALUES (p_category_id, p_attachment_ids, coalesce(p_expires_at, now() + interval '30 days'))
  RETURNING * INTO v_demanda;

  IF p_form_answers IS NOT NULL AND p_form_answers <> '{}'::jsonb THEN
    SELECT c.request_form_key INTO v_form_key FROM public.categories c WHERE c.id = p_category_id;
    IF v_form_key IS NOT NULL THEN
      PERFORM public.fn_form_result_upsert(v_form_key, 'demanda', v_demanda.uid::text, p_form_answers);
    END IF;
  END IF;

  RETURN v_demanda;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_demanda_create(bigint, jsonb, jsonb, timestamptz) TO auth_user;

NOTIFY pgrst, 'reload schema';
