-- plugins/search/0013_search_expires_at.sql
-- `fn_search_services` passa a devolver `expires_at` (validade do anúncio, `services.expires_at`).
-- Nos eventos essa coluna é o "Acontece em" (data do evento, fim do dia no horário local do evento, Cuiabá em MT): o
-- card mostra a data a partir dela, em vez de abrir `form_results.answers.data_inicio`.
-- `event_start` continua sendo devolvido (RPCs/consumidores antigos), mas o card não depende mais dele.
--
-- O tipo de retorno muda (uma coluna a mais) e a assinatura ganha um 17º parâmetro, então não dá para
-- `CREATE OR REPLACE`: a função é recriada (DROP + CREATE) com os mesmos GRANTs. O DROP remove as DUAS
-- assinaturas (a de 16 parâmetros da 0011 e a de 17 desta migração, se já aplicada) para não sobrar
-- overload ambíguo no PostgREST. O resto do corpo é igual ao da 0011, com estas diferenças:
--   (1) devolve `expires_at`;
--   (2) `event_start` cai no dia do `expires_at` quando o formulário não tem `data_inicio`, e o apelido
--       `p_order => 'event_start'` ordena por `expires_at:asc` (a data do evento passou a ser o
--       "Acontece em");
--   (3) novo `p_expired_grace jsonb` (padrão NULL): mapa `{ "<slug do grupo>": dias }`, ex. `{"eventos": 2}`.
--       Anúncio daquele grupo com `expires_at` vencido há no máximo N dias continua na busca (o
--       cliente o marca como "já aconteceu" pelo `expires_at` devolvido). Só valem dias inteiros de 1 a
--       365; qualquer outro valor (texto, negativo, decimal, objeto que não seja um mapa) conta 0 = o
--       comportamento de sempre (vencido some), sem erro. Sem a chave, nada muda.
--   (4) vencido vem SEMPRE depois do não vencido, em qualquer ordenação (inclusive relevância e busca
--       por texto); entre os vencidos, o que venceu há menos tempo primeiro.
-- Idempotente (DROP IF EXISTS).

DROP FUNCTION IF EXISTS public.fn_search_services(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, integer, text, text[], text[], bigint[], jsonb, jsonb, text);
DROP FUNCTION IF EXISTS public.fn_search_services(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, integer, text, text[], text[], bigint[], jsonb, jsonb, text, jsonb);

CREATE FUNCTION public.fn_search_services(
  p_state character varying,
  p_city_id integer,
  p_group_category_slug character varying,
  p_category_id bigint DEFAULT NULL::bigint,
  p_subcategories jsonb DEFAULT NULL::jsonb,
  p_query text DEFAULT NULL::text,
  p_seed double precision DEFAULT NULL::double precision,
  p_page integer DEFAULT 0,
  p_page_size integer DEFAULT 20,
  p_city_ibge text DEFAULT NULL::text,
  p_exclude_category_slugs text[] DEFAULT NULL::text[],
  p_city_ibges text[] DEFAULT NULL::text[],
  p_category_ids bigint[] DEFAULT NULL::bigint[],
  p_tags jsonb DEFAULT NULL::jsonb,
  p_local_refs jsonb DEFAULT NULL::jsonb,
  p_order text DEFAULT NULL::text,
  p_expired_grace jsonb DEFAULT NULL::jsonb
)
RETURNS TABLE(
  uid uuid,
  title character varying,
  price numeric,
  price_type character varying,
  category character varying,
  category_slug character varying,
  category_group_slug character varying,
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
  event_start character varying,
  venue character varying,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_query tsquery;
  v_group_id bigint;
  v_state text := NULLIF(btrim(p_state), '');
  v_city  text := NULLIF(btrim(p_city_ibge), '');
  -- cidades aceitas: a lista de irmãs (sem vazios) ou só a selecionada; NULL = sem filtro de cidade
  v_cities text[];
  v_has_loc boolean;
  -- tags pedidas (normalizadas, sem vazias); NULL = sem filtro de tag
  v_tags text[];
  -- valores de `extras.local_ref` pedidos (aparados, sem vazios); NULL = sem esse filtro
  v_refs text[];
  -- anúncios publicados com alguma das tags OU com local_ref pedido; NULL = sem filtro
  v_tag_ids bigint[];
  -- `p_order` = '<campo>[:asc|desc]' de uma lista fechada (colunas de services, nada de JSON);
  -- apelidos: event_start = expires_at:asc (0013: o "Acontece em" do evento), recent = created_at:desc
  v_order text := lower(btrim(COALESCE(p_order, '')));
  v_field text;
  v_desc  boolean;
BEGIN
  v_order := CASE v_order
    WHEN 'event_start' THEN 'expires_at:asc'
    WHEN 'recent' THEN 'created_at:desc'
    ELSE v_order
  END;
  v_field := split_part(v_order, ':', 1);
  v_desc := split_part(v_order, ':', 2) = 'desc';
  IF v_field NOT IN ('occurs_at', 'created_at', 'expires_at', 'price', 'title') THEN
    v_field := NULL; -- relevância (a ordem de sempre)
  END IF;
  PERFORM setseed(COALESCE(p_seed, random()));
  SELECT array_agg(DISTINCT btrim(c)) INTO v_cities
    FROM unnest(p_city_ibges) c
   WHERE btrim(c) <> '';
  IF v_cities IS NULL AND v_city IS NOT NULL THEN
    v_cities := ARRAY[v_city];
  END IF;
  -- o IBGE já identifica a UF: com cidade(s) definida(s) o filtro de estado sairia redundante — e
  -- barraria irmãs de estados diferentes.
  IF v_cities IS NOT NULL THEN
    v_state := NULL;
  END IF;
  v_has_loc := (v_state IS NOT NULL OR v_cities IS NOT NULL);

  IF p_tags IS NOT NULL AND jsonb_typeof(p_tags) = 'array' THEN
    SELECT array_agg(DISTINCT lower(btrim(t))) INTO v_tags
      FROM jsonb_array_elements_text(p_tags) t
     WHERE btrim(t) <> '';
  END IF;
  IF p_local_refs IS NOT NULL AND jsonb_typeof(p_local_refs) = 'array' THEN
    SELECT array_agg(DISTINCT btrim(r)) INTO v_refs
      FROM jsonb_array_elements_text(p_local_refs) r
     WHERE btrim(r) <> '';
  END IF;
  IF v_tags IS NOT NULL OR v_refs IS NOT NULL THEN
    -- mesmos predicados dos índices parciais `services_extras_tags` (services 0011) e
    -- `services_extras_local_ref` (services 0014); UNION para cada ramo usar o seu índice
    v_tag_ids := ARRAY(
      SELECT st.id
        FROM public.services st
       WHERE v_tags IS NOT NULL
         AND st.active
         AND st.status = 'active'
         AND (st.extras -> 'tags') ?| v_tags
      UNION
      SELECT sr.id
        FROM public.services sr
       WHERE v_refs IS NOT NULL
         AND sr.active
         AND sr.status = 'active'
         AND (sr.extras ->> 'local_ref') = ANY(v_refs)
      UNION
      -- o formulário do evento (plugin forms) grava o campo em `form_results.answers.local_ref`;
      -- `@>` por valor usa o GIN `form_results_answers_gin` (jsonb_path_ops)
      SELECT sf.id
        FROM unnest(v_refs) ref
        JOIN public.form_results fr
          ON fr.domain = 'service'
         AND fr.answers @> jsonb_build_object('local_ref', ref)
        JOIN public.services sf
          ON sf.id::text = fr.reference_id
       WHERE sf.active
         AND sf.status = 'active'
    );
  END IF;

  IF p_query IS NOT NULL AND btrim(p_query) <> '' THEN
    v_query := plainto_tsquery('portuguese', unaccent(p_query));
  END IF;

  IF p_group_category_slug IS NOT NULL AND btrim(p_group_category_slug) <> '' THEN
    SELECT cg.id INTO v_group_id
      FROM public.categories_group cg
     WHERE cg.slug = p_group_category_slug
       AND cg.active = true;

    IF v_group_id IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  WITH services_filtered AS MATERIALIZED (
    SELECT
      s.id                                 AS service_id,
      s.uid,
      s.title::character varying           AS title,
      s.starting_price::numeric            AS price,
      s.price_unit::character varying      AS price_type,
      c.name::character varying            AS category,
      c.slug::character varying            AS category_slug,
      COALESCE(cgs.slug, cgc.slug)::character varying AS category_group_slug,
      sub.name::character varying          AS subcategory,
      COALESCE(s.sponsored, false)         AS sponsored,
      COALESCE(
        NULLIF(s.extras->>'coverFileId', ''),
        s.extras->'images'->>0
      )::character varying                 AS cover_file_id,
      COALESCE(prov.display_name, prov.full_name)::character varying AS provider_name,
      prov.avatar_url::character varying   AS provider_avatar,
      prov.prov_city                       AS provider_city,
      prov.prov_state                      AS provider_state,
      -- só com irmãs: o anúncio é da cidade selecionada? (mesma regra do filtro de local abaixo)
      (
        cardinality(v_cities) > 1
        AND v_city IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.service_addresses ah
            WHERE ah.service_id = s.id AND ah.active AND ah.city_ibge = v_city
          )
          OR (
            NOT EXISTS (
              SELECT 1 FROM public.service_addresses ah0
              WHERE ah0.service_id = s.id AND ah0.active
            )
            AND prov.prov_city_ibge = v_city
          )
        )
      ) IS TRUE                            AS in_home_city,
      rs.average_rating::numeric           AS rating,
      COALESCE(rs.total_reviews, 0)::integer AS reviews,
      CASE
        WHEN v_query IS NOT NULL
        THEN ts_rank(
          to_tsvector('portuguese', unaccent(s.title || ' ' || COALESCE(s.description, ''))),
          v_query
        )
        ELSE 0::real
      END AS text_rank,
      s.created_at                         AS created_at,
      s.occurs_at                          AS occurs_at,
      s.expires_at                         AS expires_at,
      -- vencido (ainda aparece só se o grupo tem tolerância em `p_expired_grace`): vai ao fim da lista
      (s.expires_at IS NOT NULL AND s.expires_at <= now()) AS is_expired,
      s.starting_price::numeric            AS sort_price
    FROM public.services s
    LEFT JOIN public.categories c ON c.id = s.category_id
    LEFT JOIN public.categories_group cgs ON cgs.id = s.category_group_id
    LEFT JOIN public.categories_group cgc ON cgc.id = c.category_group_id
    -- dias de tolerância do grupo do anúncio (mesmo slug devolvido em `category_group_slug`):
    -- só inteiro de 1 a 365; o resto (ou sem mapa/sem o grupo) = 0. CASEs aninhados: o cast só roda
    -- depois de o regex passar, e nunca estoura.
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        CASE WHEN jsonb_typeof(p_expired_grace) = 'object' THEN
          CASE WHEN (p_expired_grace ->> COALESCE(cgs.slug, cgc.slug)) ~ '^\d{1,3}$' THEN
            CASE WHEN (p_expired_grace ->> COALESCE(cgs.slug, cgc.slug))::integer BETWEEN 1 AND 365
                 THEN (p_expired_grace ->> COALESCE(cgs.slug, cgc.slug))::integer
            END
          END
        END,
        0
      ) AS days
    ) gr ON true
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
      AND (s.expires_at IS NULL OR s.expires_at > now() - make_interval(days => gr.days))
      AND (p_category_id IS NULL OR s.category_id = p_category_id)
      AND (v_tag_ids IS NULL OR s.id = ANY(v_tag_ids))
      AND (
        p_category_ids IS NULL
        OR cardinality(p_category_ids) = 0
        OR s.category_id = ANY(p_category_ids)
      )
      AND (
        p_category_id IS NOT NULL
        OR (p_category_ids IS NOT NULL AND cardinality(p_category_ids) > 0)
        OR p_exclude_category_slugs IS NULL
        OR c.slug IS NULL
        OR c.slug <> ALL(p_exclude_category_slugs)
      )
      AND (
        v_group_id IS NULL
        OR s.category_group_id = v_group_id
        -- grupo principal da categoria: anúncio sem grupo gravado (ou com um grupo antigo, de
        -- antes de a categoria mudar de grupo) continua aparecendo no grupo da categoria dele
        OR c.category_group_id = v_group_id
        OR EXISTS (
          SELECT 1
          FROM public.categories_group_link cgl
          WHERE cgl.category_id = s.category_id
            AND cgl.category_group_id = v_group_id
        )
      )
      AND (
        NOT v_has_loc
        OR s.service_location = 'remoto'
        OR EXISTS (
          SELECT 1
          FROM public.service_addresses a
          WHERE a.service_id = s.id
            AND a.active
            AND (v_state IS NULL OR a.state = v_state)
            AND (v_cities IS NULL OR a.city_ibge = ANY(v_cities))
        )
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.service_addresses a0
            WHERE a0.service_id = s.id AND a0.active
          )
          AND (v_state IS NULL OR prov.prov_state = v_state)
          AND (v_cities IS NULL OR prov.prov_city_ibge = ANY(v_cities))
        )
      )
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
  ),
  page AS (
    SELECT sf.*, row_number() OVER () AS rn
    FROM (
      SELECT f.*
      FROM services_filtered f
      ORDER BY
        -- vencidos (tolerância de `p_expired_grace`) sempre depois dos não vencidos; entre eles, o que
        -- venceu há menos tempo primeiro
        f.is_expired ASC,
        CASE WHEN f.is_expired THEN f.expires_at END DESC NULLS LAST,
        CASE WHEN v_query IS NOT NULL THEN f.text_rank END DESC NULLS LAST,
        -- occurs_at crescente: o que ainda vai acontecer primeiro (do mais próximo ao mais
        -- distante), depois o que já passou; sem data por último
        CASE WHEN v_field = 'occurs_at' AND NOT v_desc THEN (f.occurs_at >= now()) END DESC NULLS LAST,
        CASE WHEN v_field = 'occurs_at' AND NOT v_desc THEN f.occurs_at END ASC NULLS LAST,
        CASE WHEN v_field = 'occurs_at' AND v_desc THEN f.occurs_at END DESC NULLS LAST,
        CASE WHEN v_field = 'created_at' AND NOT v_desc THEN f.created_at END ASC NULLS LAST,
        CASE WHEN v_field = 'created_at' AND v_desc THEN f.created_at END DESC NULLS LAST,
        CASE WHEN v_field = 'expires_at' AND NOT v_desc THEN f.expires_at END ASC NULLS LAST,
        CASE WHEN v_field = 'expires_at' AND v_desc THEN f.expires_at END DESC NULLS LAST,
        CASE WHEN v_field = 'price' AND NOT v_desc THEN f.sort_price END ASC NULLS LAST,
        CASE WHEN v_field = 'price' AND v_desc THEN f.sort_price END DESC NULLS LAST,
        CASE WHEN v_field = 'title' AND NOT v_desc THEN f.title END ASC,
        CASE WHEN v_field = 'title' AND v_desc THEN f.title END DESC,
        f.in_home_city DESC,
        f.rating DESC NULLS LAST,
        (f.provider_city IS NOT NULL) DESC,
        random()
      LIMIT p_page_size
      OFFSET (p_page * p_page_size)
    ) sf
  )
  SELECT
    pg.uid,
    pg.title::character varying,
    pg.price::numeric,
    pg.price_type::character varying,
    pg.category::character varying,
    pg.category_slug::character varying,
    pg.category_group_slug::character varying,
    pg.subcategory::character varying,
    pg.sponsored,
    pg.cover_file_id::character varying,
    pg.provider_name::character varying,
    pg.provider_avatar::character varying,
    pg.rating::numeric,
    pg.reviews::integer,
    COALESCE(ad.a_city, pg.provider_city)::text,
    COALESCE(ad.a_state, pg.provider_state)::text,
    COALESCE(ad.cnt, 0)::integer,
    -- data de início do formulário (importador/legado); sem ela, o dia do "Acontece em" (expires_at,
    -- fuso de Cuiabá) quando o anúncio tem formulário — o formulário novo não pede mais data de início
    COALESCE(
      ev.event_start,
      CASE WHEN ev.has_form
           THEN to_char(pg.expires_at AT TIME ZONE 'America/Cuiaba', 'YYYY-MM-DD')
      END
    )::character varying,
    ad.a_label::character varying,
    pg.expires_at
  FROM page pg
  LEFT JOIN LATERAL (
    SELECT NULLIF(fr.answers->>'data_inicio', '')::character varying AS event_start, true AS has_form
    FROM public.form_results fr
    WHERE fr.domain = 'service'
      AND fr.reference_id = pg.service_id::text
    LIMIT 1
  ) ev ON true
  LEFT JOIN LATERAL (
    SELECT a.city AS a_city, a.state AS a_state, a.label AS a_label, count(*) OVER () AS cnt
    FROM public.service_addresses a
    WHERE a.service_id = pg.service_id
      AND a.active
    ORDER BY
      (v_has_loc
       AND (v_state IS NULL OR a.state = v_state)
       AND (v_cities IS NULL OR a.city_ibge = ANY(v_cities))) DESC,
      (a.city_ibge IS NOT DISTINCT FROM v_city) DESC,
      a.is_primary DESC,
      a.id
    LIMIT 1
  ) ad ON true
  ORDER BY pg.rn;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_search_services(character varying, integer, character varying, bigint, jsonb, text, double precision, integer, integer, text, text[], text[], bigint[], jsonb, jsonb, text, jsonb)
  TO anon, auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('search', '1.12.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
