-- plugins/swipe/0001_swipe.sql
-- Optional. Swipe (curtir/passar) sobre os itens da busca, página /descobrir + /curtidos.
-- Depende de (aplique DEPOIS): `search` (fn_search_services), `services`, `system_config`.
--
--  * `service_swipes`: 1 linha por (usuário, item). Upsert a cada swipe; nunca DELETE físico —
--    "descurtir" grava `skip` (o item volta ao deck depois do TTL).
--  * `fn_swipe_deck`: embrulha `fn_search_services` (mesmos filtros, página 0, até 1000
--    candidatos) e tira: curtidos, passados há menos de `swipe.skip_ttl_days` e `p_exclude`
--    (cards que o cliente já tem no buffer / passados do anônimo). Sempre página 0: o que já foi
--    decidido sai pelo anti-join, então offset não é necessário (e daria pulos/repetições).
--  * Usuário vem da sessão (`auth.fun_auth_user_id()`, NULL para anon), nunca de parâmetro.

CREATE TABLE IF NOT EXISTS public.service_swipes (
    user_id      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    service_uid  uuid NOT NULL REFERENCES public.services(uid) ON DELETE RESTRICT,
    action       text NOT NULL CHECK (action IN ('like', 'skip')),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT service_swipes_pkey PRIMARY KEY (user_id, service_uid)
);

-- curtidos do usuário, mais recentes primeiro
CREATE INDEX IF NOT EXISTS service_swipes_liked_idx
  ON public.service_swipes (user_id, updated_at DESC) WHERE action = 'like';

ALTER TABLE public.service_swipes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_swipes TO auth_user;
DROP POLICY IF EXISTS service_swipes_owner ON public.service_swipes;
CREATE POLICY service_swipes_owner ON public.service_swipes FOR ALL TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

INSERT INTO auth.system_config (key, value)
VALUES ('swipe.skip_ttl_days', '7'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[]);

CREATE OR REPLACE FUNCTION public.fn_swipe_deck(
  p_state character varying,
  p_city_id integer,
  p_group_category_slug character varying,
  p_category_id bigint DEFAULT NULL::bigint,
  p_subcategories jsonb DEFAULT NULL::jsonb,
  p_query text DEFAULT NULL::text,
  p_seed double precision DEFAULT NULL::double precision,
  p_page_size integer DEFAULT 20,
  p_city_ibge text DEFAULT NULL::text,
  p_exclude uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE(
  uid uuid,
  title character varying,
  price numeric,
  price_type character varying,
  category character varying,
  subcategory character varying,
  sponsored boolean,
  cover_file_id character varying,
  provider_name character varying,
  provider_avatar character varying,
  rating numeric,
  reviews integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.fun_auth_user_id();
  v_ttl interval := make_interval(days => COALESCE(
    NULLIF((SELECT value #>> '{}' FROM auth.system_config WHERE key = 'swipe.skip_ttl_days'), '')::integer,
    7
  ));
BEGIN
  RETURN QUERY
  SELECT c.*
  FROM public.fn_search_services(
    p_state, p_city_id, p_group_category_slug, p_category_id, p_subcategories,
    p_query, p_seed, 0, 1000, p_city_ibge
  ) c
  WHERE (p_exclude IS NULL OR NOT (c.uid = ANY(p_exclude)))
    AND (
      v_user IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.service_swipes sw
        WHERE sw.user_id = v_user
          AND sw.service_uid = c.uid
          AND (sw.action = 'like' OR sw.updated_at > now() - v_ttl)
      )
    )
  LIMIT LEAST(GREATEST(p_page_size, 1), 50);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[])
  TO anon, auth_user;

DROP FUNCTION IF EXISTS public.fn_swipe_record(uuid[], text);

CREATE OR REPLACE FUNCTION public.fn_swipe_record(p_service_uids uuid[], p_action text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.fun_auth_user_id();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'login necessario' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_action NOT IN ('like', 'skip') THEN
    RAISE EXCEPTION 'action invalida: %', p_action USING ERRCODE = 'invalid_parameter_value';
  END IF;

  INSERT INTO public.service_swipes (user_id, service_uid, action, updated_at)
  SELECT v_user, s.uid, p_action, now()
  FROM public.services s
  WHERE s.uid = ANY(p_service_uids)
  ON CONFLICT (user_id, service_uid)
  DO UPDATE SET action = EXCLUDED.action, updated_at = EXCLUDED.updated_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_swipe_record(uuid[], text) TO auth_user;

DROP FUNCTION IF EXISTS public.fn_swipe_liked(integer, integer);

CREATE OR REPLACE FUNCTION public.fn_swipe_liked(p_page integer DEFAULT 0, p_page_size integer DEFAULT 24)
RETURNS TABLE(
  uid uuid,
  title character varying,
  price numeric,
  price_type character varying,
  category character varying,
  cover_file_id character varying,
  liked_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.fun_auth_user_id();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'login necessario' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    s.uid,
    s.title::character varying,
    s.starting_price::numeric,
    s.price_unit::character varying,
    c.name::character varying,
    COALESCE(NULLIF(s.extras->>'coverFileId', ''), s.extras->'images'->>0)::character varying,
    sw.updated_at
  FROM public.service_swipes sw
  JOIN public.services s ON s.uid = sw.service_uid
  LEFT JOIN public.categories c ON c.id = s.category_id
  WHERE sw.user_id = v_user
    AND sw.action = 'like'
    AND s.active = true
    AND s.status = 'active'
  ORDER BY sw.updated_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 100)
  OFFSET GREATEST(p_page, 0) * LEAST(GREATEST(p_page_size, 1), 100);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_swipe_liked(integer, integer) TO auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('swipe', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
