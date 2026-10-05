-- plugins/swipe/0003_swipe_reactions.sql
-- Gostei / Favorito no mesmo lugar (`service_user_favorites`, `kind` = like | favorite) com os
-- totais em `services.like_count` / `services.favorite_count` (trigger de 0001).
--
--  * `fn_service_reaction_state(p_service_uid)`: estado do usuário da sessão no anúncio + totais.
--    Pública (anon recebe liked/favorite = false e os totais).
--  * `fn_service_react(p_service_uid, p_kind, p_active)`: liga/desliga `like` ou `favorite` do
--    usuário da sessão e devolve o mesmo formato de `fn_service_reaction_state`. Remover nunca
--    apaga a linha — `active = false` (a trigger decrementa o total).
--  * `fn_swipe_liked(p_before, p_page_size, p_kind)`: lista do usuário (curtidos + favoritos
--    juntos, 1 linha por anúncio) com as colunas do card da busca (`ListingResultCard`).
--    `p_kind` = 'like' | 'favorite' filtra; NULL = todos. Cursor por `reacted_at`.
-- Usuário vem sempre da sessão (`auth.fun_auth_user_id()`), nunca de parâmetro.
-- Depende de `search` (mesmas tabelas: user_data, review_stats, service_addresses).

DROP FUNCTION IF EXISTS public.fn_service_reaction_state(uuid);

CREATE OR REPLACE FUNCTION public.fn_service_reaction_state(p_service_uid uuid)
RETURNS TABLE(liked boolean, favorite boolean, like_count integer, favorite_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.service_user_favorites sw
      WHERE sw.user_id = auth.fun_auth_user_id() AND sw.service_uid = s.uid
        AND sw.kind = 'like' AND sw.active
    ),
    EXISTS (
      SELECT 1 FROM public.service_user_favorites sw
      WHERE sw.user_id = auth.fun_auth_user_id() AND sw.service_uid = s.uid
        AND sw.kind = 'favorite' AND sw.active
    ),
    s.like_count,
    s.favorite_count
  FROM public.services s
  WHERE s.uid = p_service_uid;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_service_reaction_state(uuid) TO anon, auth_user;

DROP FUNCTION IF EXISTS public.fn_service_react(uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.fn_service_react(p_service_uid uuid, p_kind text, p_active boolean)
RETURNS TABLE(liked boolean, favorite boolean, like_count integer, favorite_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user uuid := auth.fun_auth_user_id();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'login necessario' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('like', 'favorite') THEN
    RAISE EXCEPTION 'kind invalido: %', p_kind USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.services s WHERE s.uid = p_service_uid) THEN
    RAISE EXCEPTION 'anuncio nao encontrado' USING ERRCODE = 'no_data_found';
  END IF;

  IF COALESCE(p_active, false) THEN
    INSERT INTO public.service_user_favorites (user_id, service_uid, kind, active, updated_at)
    VALUES (v_user, p_service_uid, p_kind::public.service_reaction_kind, true, now())
    ON CONFLICT (user_id, service_uid, kind)
    DO UPDATE SET active = true, updated_at = now()
    WHERE NOT public.service_user_favorites.active;
  ELSE
    UPDATE public.service_user_favorites
       SET active = false, updated_at = now()
     WHERE user_id = v_user
       AND service_uid = p_service_uid
       AND kind = p_kind::public.service_reaction_kind
       AND active;
  END IF;

  RETURN QUERY SELECT * FROM public.fn_service_reaction_state(p_service_uid);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_service_react(uuid, text, boolean) TO auth_user;

DROP FUNCTION IF EXISTS public.fn_swipe_liked(timestamptz, integer);
DROP FUNCTION IF EXISTS public.fn_swipe_liked(timestamptz, integer, text);

CREATE OR REPLACE FUNCTION public.fn_swipe_liked(
  p_before timestamptz DEFAULT NULL,
  p_page_size integer DEFAULT 24,
  p_kind text DEFAULT NULL
)
RETURNS TABLE(
  uid uuid,
  title character varying,
  price numeric,
  price_type character varying,
  category character varying,
  category_slug character varying,
  subcategory character varying,
  sponsored boolean,
  cover_file_id character varying,
  provider_name character varying,
  provider_avatar character varying,
  rating numeric,
  reviews integer,
  city text,
  state text,
  address_count integer,
  liked boolean,
  favorite boolean,
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
  IF p_kind IS NOT NULL AND p_kind NOT IN ('like', 'favorite') THEN
    RAISE EXCEPTION 'kind invalido: %', p_kind USING ERRCODE = 'invalid_parameter_value';
  END IF;

  RETURN QUERY
  WITH mine AS (
    SELECT
      sw.service_uid,
      bool_or(sw.kind = 'like')     AS is_liked,
      bool_or(sw.kind = 'favorite') AS is_favorite,
      max(sw.updated_at)            AS reacted_at
    FROM public.service_user_favorites sw
    WHERE sw.user_id = v_user
      AND sw.active
      AND sw.kind IN ('like', 'favorite')
    GROUP BY sw.service_uid
  )
  SELECT
    s.uid,
    s.title::character varying,
    s.starting_price::numeric,
    s.price_unit::character varying,
    c.name::character varying,
    c.slug::character varying,
    sub.name::character varying,
    COALESCE(s.sponsored, false),
    COALESCE(NULLIF(s.extras->>'coverFileId', ''), s.extras->'images'->>0)::character varying,
    COALESCE(prov.display_name, prov.full_name)::character varying,
    prov.avatar_url::character varying,
    rs.average_rating::numeric,
    COALESCE(rs.total_reviews, 0)::integer,
    COALESCE(ad.a_city, prov.city)::text,
    COALESCE(ad.a_state, prov.state)::text,
    COALESCE(ad.cnt, 0)::integer,
    m.is_liked,
    m.is_favorite,
    m.reacted_at
  FROM mine m
  JOIN public.services s ON s.uid = m.service_uid
  LEFT JOIN public.categories c ON c.id = s.category_id
  LEFT JOIN LATERAL (
    SELECT cs.name
    FROM public.service_categories_sub scs
    JOIN public.categories_sub cs ON cs.id = scs.category_sub_id
    WHERE scs.service_id = s.id AND scs.active = true AND cs.active = true
    ORDER BY scs.id
    LIMIT 1
  ) sub ON true
  LEFT JOIN LATERAL (
    SELECT ud.full_name, ud.display_name, ud.avatar_url, ud.state, ud.city
    FROM public.user_data ud
    WHERE ud.tenant_id = s.tenant_id AND ud.active = true
    ORDER BY ud.created_at
    LIMIT 1
  ) prov ON true
  LEFT JOIN public.review_stats rs
    ON rs.domain = 'service' AND rs.reference_id = s.id::text
  LEFT JOIN LATERAL (
    SELECT a.city AS a_city, a.state AS a_state, count(*) OVER () AS cnt
    FROM public.service_addresses a
    WHERE a.service_id = s.id AND a.active
    ORDER BY a.is_primary DESC, a.id
    LIMIT 1
  ) ad ON true
  WHERE s.active = true
    AND s.status = 'active'
    AND (p_kind IS NULL OR (p_kind = 'like' AND m.is_liked) OR (p_kind = 'favorite' AND m.is_favorite))
    AND (p_before IS NULL OR m.reacted_at < p_before)
  ORDER BY m.reacted_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 100);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_swipe_liked(timestamptz, integer, text) TO auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('swipe', '1.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
