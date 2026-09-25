-- plugins/search/0001_search.sql
-- Optional. Busca pública de serviços: a RPC `fn_search_services` (texto + filtros), usada pela
-- página `/busca` e pelo chat com IA. Sem tabelas próprias — só lê o que outros plugins criam.
--
-- Depende de (aplique DEPOIS): `services`, `taxonomy` (categories_group, categories_group_link,
-- categories_sub), `user_data` (state / city_ibge do prestador) e `reviews` (review_stats, a nota
-- média no ranking). Coloque `search` depois deles em `kizuna.plugins.json`.
--
-- Origem: `fn_search_ads` do foco-total, generalizada. O que ela faz:
--  * fonte única: `public.services` ativos (`active = true AND status = 'active'`);
--  * `p_group_category_slug`: filtra pelo grupo (slug) — enxerga o grupo carimbado no serviço E os
--    vínculos secundários (`categories_group_link`), casando pela CATEGORIA do serviço;
--  * `p_category_id` / `p_subcategories` (jsonb de ids): categoria e especialidades;
--  * `p_state` / `p_city_ibge`: localização do PRESTADOR (`user_data` do tenant dono do serviço);
--    `p_city_id` só entra como critério leve de ordenação (prestador com cidade preenchida antes);
--  * `p_query`: texto livre sem acento (tsvector 'portuguese' + ILIKE no título);
--  * ordenação: relevância do texto → nota média → cidade preenchida → aleatório (`p_seed` mantém a
--    ordem estável entre páginas da mesma busca).
-- SECURITY DEFINER com `search_path` fixo: a busca roda sem sessão (`anon`) e `services` não é
-- legível por ele; a função só devolve a lista fixa de colunas públicas abaixo (nada de `extras`,
-- `tenant_id` etc.). Rating/reviews: agregado O(1) de `review_stats`, sem comentários.

CREATE EXTENSION IF NOT EXISTS unaccent;

DROP FUNCTION IF EXISTS public.fn_search_services(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, integer, text);

CREATE OR REPLACE FUNCTION public.fn_search_services(
  p_state character varying,
  p_city_id integer,
  p_group_category_slug character varying,
  p_category_id bigint DEFAULT NULL::bigint,
  p_subcategories jsonb DEFAULT NULL::jsonb,
  p_query text DEFAULT NULL::text,
  p_seed double precision DEFAULT NULL::double precision,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 20,
  p_city_ibge text DEFAULT NULL::text
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
  v_query tsquery;
  v_group_id bigint;
BEGIN
  PERFORM setseed(COALESCE(p_seed, random()));

  IF p_query IS NOT NULL AND btrim(p_query) <> '' THEN
    v_query := plainto_tsquery('portuguese', unaccent(p_query));
  END IF;

  IF p_group_category_slug IS NOT NULL AND btrim(p_group_category_slug) <> '' THEN
    SELECT cg.id INTO v_group_id
      FROM public.categories_group cg
     WHERE cg.slug = p_group_category_slug
       AND cg.active = true;

    -- Slug desconhecido ou inativo: nada a devolver.
    IF v_group_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH services_filtered AS MATERIALIZED (
    SELECT
      s.uid,
      s.title::character varying           AS title,
      s.starting_price::numeric            AS price,
      s.price_unit::character varying      AS price_type,
      c.name::character varying            AS category,
      sub.name::character varying          AS subcategory,
      COALESCE(s.sponsored, false)         AS sponsored,
      COALESCE(
        NULLIF(s.extras->>'coverFileId', ''),
        s.extras->'images'->>0
      )::character varying                 AS cover_file_id,
      COALESCE(prov.display_name, prov.full_name)::character varying AS provider_name,
      prov.avatar_url::character varying   AS provider_avatar,
      prov.prov_city                       AS provider_city,
      rs.average_rating::numeric           AS rating,
      COALESCE(rs.total_reviews, 0)::integer AS reviews,
      CASE
        WHEN v_query IS NOT NULL
        THEN ts_rank(
          to_tsvector('portuguese', unaccent(s.title || ' ' || COALESCE(s.description, ''))),
          v_query
        )
        ELSE 0::real
      END AS text_rank
    FROM public.services s
    LEFT JOIN public.categories c ON c.id = s.category_id
    LEFT JOIN LATERAL (
      SELECT cs.name
      FROM public.service_categories_sub scs
      JOIN public.categories_sub cs ON cs.id = scs.category_sub_id
      WHERE scs.service_id = s.id
        AND scs.active = true
        AND cs.active = true
      ORDER BY scs.id
      LIMIT 1
    ) sub ON true
    LEFT JOIN LATERAL (
      SELECT ud.full_name, ud.display_name, ud.avatar_url,
             ud.state AS prov_state, ud.city AS prov_city, ud.city_ibge AS prov_city_ibge
      FROM public.user_data ud
      WHERE ud.tenant_id = s.tenant_id
        AND ud.active = true
      ORDER BY ud.created_at
      LIMIT 1
    ) prov ON true
    LEFT JOIN public.review_stats rs
      ON rs.domain = 'service' AND rs.reference_id = s.id::text
    WHERE s.active = true
      AND s.status = 'active'
      AND (p_category_id IS NULL OR s.category_id = p_category_id)
      AND (
        v_group_id IS NULL
        OR s.category_group_id = v_group_id
        OR EXISTS (
          SELECT 1
          FROM public.categories_group_link cgl
          WHERE cgl.category_id = s.category_id
            AND cgl.category_group_id = v_group_id
        )
      )
      AND (p_state IS NULL OR btrim(p_state) = '' OR prov.prov_state = p_state)
      AND (p_city_ibge IS NULL OR btrim(p_city_ibge) = '' OR prov.prov_city_ibge = p_city_ibge)
      AND (
        p_subcategories IS NULL
        OR jsonb_array_length(p_subcategories) = 0
        OR EXISTS (
          SELECT 1
          FROM public.service_categories_sub scs
          WHERE scs.service_id = s.id
            AND scs.active = true
            AND scs.category_sub_id IN (
              SELECT (value)::bigint FROM jsonb_array_elements_text(p_subcategories)
            )
        )
      )
      AND (
        v_query IS NULL
        OR to_tsvector('portuguese', unaccent(s.title || ' ' || COALESCE(s.description, ''))) @@ v_query
        OR unaccent(s.title) ILIKE '%' || unaccent(p_query) || '%'
      )
  )
  SELECT
    sf.uid,
    sf.title::character varying,
    sf.price::numeric,
    sf.price_type::character varying,
    sf.category::character varying,
    sf.subcategory::character varying,
    sf.sponsored,
    sf.cover_file_id::character varying,
    sf.provider_name::character varying,
    sf.provider_avatar::character varying,
    sf.rating::numeric,
    sf.reviews::integer
  FROM services_filtered sf
  ORDER BY
    CASE WHEN v_query IS NOT NULL THEN sf.text_rank END DESC NULLS LAST,
    sf.rating DESC NULLS LAST,
    (sf.provider_city IS NOT NULL) DESC,
    random()
  LIMIT p_page_size
  OFFSET (p_page * p_page_size);
END;
$function$;

-- Pública: a busca roda sem sessão. Só leitura (a função é o único ponto de acesso).
GRANT EXECUTE ON FUNCTION public.fn_search_services(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, integer, text)
  TO anon, auth_user;

-- Plugin registration (see plugins/README.md convention). No auth.permissions rows: read-only
-- public search, nothing admin-manageable.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('search', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
