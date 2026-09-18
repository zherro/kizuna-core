-- plugins/demandas/0002_demandas_attachments.sql
-- Anexos (imagem/PDF) na demanda: cliente pode anexar arquivos ao pedir um serviço. Segue o
-- mesmo padrão de `services.extras.images` — só um array de `public.files.id` guardado direto na
-- linha, sem tabela de junção (files.purpose = 'demanda_attachment', ver
-- 0003_storage_demanda_attachment_purpose.sql no plugin storage). Os arquivos são enviados pro
-- storage genérico ANTES da demanda existir (o cliente anexa enquanto preenche o formulário) —
-- `fn_demanda_create` ganha um terceiro parâmetro opcional pra receber os ids escolhidos.

ALTER TABLE public.demanda ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- CREATE OR REPLACE doesn't overwrite a different-arity signature — it'd leave the old 2-arg
-- version installed alongside this one, and PostgREST refuses to call an overloaded RPC name
-- without an explicit Prefer resolution. Drop the old signature first.
DROP FUNCTION IF EXISTS public.fn_demanda_create(bigint, jsonb);

CREATE OR REPLACE FUNCTION public.fn_demanda_create(
  p_category_id     bigint,
  p_form_answers    jsonb DEFAULT '{}'::jsonb,
  p_attachment_ids  jsonb DEFAULT '[]'::jsonb
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

  INSERT INTO public.demanda (category_id, attachments)
  VALUES (p_category_id, p_attachment_ids)
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

GRANT EXECUTE ON FUNCTION public.fn_demanda_create(bigint, jsonb, jsonb) TO auth_user;

NOTIFY pgrst, 'reload schema';
