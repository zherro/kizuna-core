-- plugins/demandas/0004_demandas_subcategories.sql
-- Demanda ganha um step obrigatório de subcategoria (categories_sub) entre a escolha de categoria
-- e o formulário dinâmico — cliente escolhe 1+ subcategorias (chips, multi-select) pra dar mais
-- sinal de qual serviço específico ele precisa. Guardado como array de `categories_sub.id`, mesmo
-- padrão de `attachments` (0002) — sem tabela de junção, sem validação server-side de que os ids
-- pertencem à categoria escolhida (mesmo nível de confiança que o resto do payload client-supplied
-- desta RPC, ver nota em 0002/0003).

ALTER TABLE public.demanda ADD COLUMN IF NOT EXISTS subcategory_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.fn_demanda_create(bigint, jsonb, jsonb, timestamptz);

CREATE OR REPLACE FUNCTION public.fn_demanda_create(
  p_category_id       bigint,
  p_form_answers      jsonb DEFAULT '{}'::jsonb,
  p_attachment_ids     jsonb DEFAULT '[]'::jsonb,
  p_expires_at         timestamptz DEFAULT NULL,
  p_subcategory_ids    jsonb DEFAULT '[]'::jsonb
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
  IF jsonb_typeof(coalesce(p_subcategory_ids, 'null'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'p_subcategory_ids deve ser um array' USING errcode = '22023';
  END IF;

  INSERT INTO public.demanda (category_id, attachments, expires_at, subcategory_ids)
  VALUES (
    p_category_id, p_attachment_ids, coalesce(p_expires_at, now() + interval '30 days'),
    p_subcategory_ids
  )
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

GRANT EXECUTE ON FUNCTION public.fn_demanda_create(bigint, jsonb, jsonb, timestamptz, jsonb) TO auth_user;

NOTIFY pgrst, 'reload schema';
