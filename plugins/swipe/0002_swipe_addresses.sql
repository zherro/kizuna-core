-- plugins/swipe/0002_swipe_addresses.sql
-- Endereços do serviço no swipe: fn_swipe_deck herda de fn_search_services (search 0002) as colunas
-- city / state / address_count; fn_swipe_liked devolve as mesmas (endereço principal + contagem,
-- via LATERAL LIMIT 1, sem duplicar linhas). Nunca devolve rua/número.
-- Depende de `search` >= 1.1.0 e `services` >= 1.2.0.

DROP FUNCTION IF EXISTS public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[], numeric, numeric);

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
  p_exclude uuid[] DEFAULT NULL::uuid[],
  p_price_min numeric DEFAULT NULL::numeric,
  p_price_max numeric DEFAULT NULL::numeric
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
  reviews integer,
  city text,
  state text,
  address_count integer
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
    AND (p_price_min IS NULL OR c.price IS NULL OR c.price <= 0 OR c.price >= p_price_min)
    AND (p_price_max IS NULL OR c.price IS NULL OR c.price <= 0 OR c.price <= p_price_max)
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

GRANT EXECUTE ON FUNCTION public.fn_swipe_deck(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, text, uuid[], numeric, numeric)
  TO anon, auth_user;

DROP FUNCTION IF EXISTS public.fn_swipe_liked(timestamptz, integer);

CREATE OR REPLACE FUNCTION public.fn_swipe_liked(p_before timestamptz DEFAULT NULL, p_page_size integer DEFAULT 24)
RETURNS TABLE(
  uid uuid,
  title character varying,
  price numeric,
  price_type character varying,
  category character varying,
  cover_file_id character varying,
  liked_at timestamptz,
  city text,
  state text,
  address_count integer
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
    sw.updated_at,
    ad.a_city::text,
    ad.a_state::text,
    COALESCE(ad.cnt, 0)::integer
  FROM public.service_swipes sw
  JOIN public.services s ON s.uid = sw.service_uid
  LEFT JOIN public.categories c ON c.id = s.category_id
  LEFT JOIN LATERAL (
    SELECT a.city AS a_city, a.state AS a_state, count(*) OVER () AS cnt
    FROM public.service_addresses a
    WHERE a.service_id = s.id
      AND a.active
    ORDER BY a.is_primary DESC, a.id
    LIMIT 1
  ) ad ON true
  WHERE sw.user_id = v_user
    AND sw.action = 'like'
    AND s.active = true
    AND s.status = 'active'
    AND (p_before IS NULL OR sw.updated_at < p_before)
  ORDER BY sw.updated_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 100);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_swipe_liked(timestamptz, integer) TO auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('swipe', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
