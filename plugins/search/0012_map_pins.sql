-- plugins/search/0012_map_pins.sql
-- Mapa: duas RPCs públicas e leves, no mesmo critério de "publicado" da busca (ativo, status
-- 'active', não expirado), expostas pela rota genérica /api/resources/<rpc> (ver `rpcSearch`).
--
--   fn_map_pins(p_lat, p_lng, p_radius_km, p_limit, p_group_slugs, p_category_slugs)
--     Os pontos de um raio, do mais perto ao mais longe: só o essencial para desenhar um pino
--     (nome, capa, local e distância) — nunca a descrição nem o formulário. Um pino por endereço
--     ativo com coordenada (um cinema com vários endereços vira vários pinos). Raio de 0,1 a
--     100 km (padrão 5) e no máximo 300 pontos (padrão 150).
--   fn_map_place(p_uid)
--     O detalhe de UM anúncio, só quando a pessoa pede "Ver mais": descrição (até 1200
--     caracteres), fotos, endereço principal e os fatos de contato/horário/preço do formulário.
--
-- Idempotente. Requer services 0003 (service_addresses) e 0016 (occurs_at).

CREATE INDEX IF NOT EXISTS service_addresses_geo
  ON public.service_addresses (latitude, longitude)
  WHERE active AND latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_map_pins(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision DEFAULT 5,
  p_limit integer DEFAULT 150,
  p_group_slugs text[] DEFAULT NULL::text[],
  p_category_slugs text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  uid uuid,
  address_id bigint,
  title character varying,
  category_slug character varying,
  category_group_slug character varying,
  cover_file_id character varying,
  latitude double precision,
  longitude double precision,
  venue character varying,
  city text,
  state text,
  distance_km double precision,
  event_start character varying
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    s.uid,
    a.id,
    s.title::character varying,
    c.slug::character varying,
    COALESCE(cgs.slug, cgc.slug)::character varying,
    COALESCE(NULLIF(s.extras->>'coverFileId', ''), s.extras->'images'->>0)::character varying,
    a.latitude::double precision,
    a.longitude::double precision,
    a.label::character varying,
    a.city::text,
    a.state::text,
    d.km,
    ev.event_start
  FROM (
    SELECT LEAST(GREATEST(COALESCE(p_radius_km, 5), 0.1), 100)::double precision AS r
  ) q
  CROSS JOIN public.service_addresses a
  JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.categories c ON c.id = s.category_id
  LEFT JOIN public.categories_group cgs ON cgs.id = s.category_group_id
  LEFT JOIN public.categories_group cgc ON cgc.id = c.category_group_id
  CROSS JOIN LATERAL (
    -- haversine, em km
    SELECT 6371 * 2 * asin(sqrt(
      power(sin(radians(a.latitude::double precision - p_lat) / 2), 2)
      + cos(radians(p_lat)) * cos(radians(a.latitude::double precision))
        * power(sin(radians(a.longitude::double precision - p_lng) / 2), 2)
    )) AS km
  ) d
  LEFT JOIN LATERAL (
    SELECT NULLIF(fr.answers->>'data_inicio', '')::character varying AS event_start
    FROM public.form_results fr
    WHERE fr.domain = 'service'
      AND fr.reference_id = s.id::text
    LIMIT 1
  ) ev ON true
  WHERE p_lat BETWEEN -90 AND 90
    AND p_lng BETWEEN -180 AND 180
    AND a.active
    AND a.latitude IS NOT NULL
    AND a.longitude IS NOT NULL
    -- caixa antes da distância: usa o índice e poupa a conta
    AND a.latitude BETWEEN p_lat - q.r / 111.3 AND p_lat + q.r / 111.3
    AND a.longitude BETWEEN p_lng - q.r / (111.3 * GREATEST(cos(radians(p_lat)), 0.01))
                        AND p_lng + q.r / (111.3 * GREATEST(cos(radians(p_lat)), 0.01))
    AND d.km <= q.r
    AND s.active = true
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND (p_group_slugs IS NULL OR COALESCE(cgs.slug, cgc.slug) = ANY(p_group_slugs))
    AND (p_category_slugs IS NULL OR c.slug = ANY(p_category_slugs))
  ORDER BY d.km, s.id, a.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 150), 1), 300)
$function$;

CREATE OR REPLACE FUNCTION public.fn_map_place(p_uid uuid)
RETURNS TABLE(
  uid uuid,
  title character varying,
  description text,
  category character varying,
  category_slug character varying,
  category_group_slug character varying,
  cover_file_id character varying,
  image_file_ids text[],
  price numeric,
  price_type character varying,
  address text,
  latitude double precision,
  longitude double precision,
  venue character varying,
  city text,
  state text,
  event_start character varying,
  facts jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    s.uid,
    s.title::character varying,
    left(COALESCE(s.description, ''), 1200),
    c.name::character varying,
    c.slug::character varying,
    COALESCE(cgs.slug, cgc.slug)::character varying,
    COALESCE(NULLIF(s.extras->>'coverFileId', ''), s.extras->'images'->>0)::character varying,
    CASE
      WHEN jsonb_typeof(s.extras->'images') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(s.extras->'images') LIMIT 6)
      ELSE ARRAY[]::text[]
    END,
    s.starting_price::numeric,
    s.price_unit::character varying,
    NULLIF(btrim(concat_ws(', ',
      NULLIF(concat_ws(' ', NULLIF(btrim(a.street), ''), NULLIF(btrim(a.number), '')), ''),
      NULLIF(btrim(a.neighborhood), ''),
      NULLIF(concat_ws(' - ', NULLIF(btrim(a.city), ''), NULLIF(btrim(a.state), '')), '')
    )), ''),
    a.latitude::double precision,
    a.longitude::double precision,
    a.label::character varying,
    a.city::text,
    a.state::text,
    NULLIF(fr.answers->>'data_inicio', '')::character varying,
    jsonb_strip_nulls(jsonb_build_object(
      'telefone', NULLIF(fr.answers->>'contato_telefone', ''),
      'whatsapp', NULLIF(fr.answers->>'contato_whatsapp', ''),
      'instagram', NULLIF(fr.answers->>'contato_instagram', ''),
      'site', NULLIF(fr.answers->>'site', ''),
      'horario', fr.answers->'horario',
      'preco', NULLIF(fr.answers->>'preco', ''),
      'gratuito', fr.answers->'gratuito',
      'dicas', NULLIF(fr.answers->>'dicas_chegada', '')
    ))
  FROM public.services s
  LEFT JOIN public.categories c ON c.id = s.category_id
  LEFT JOIN public.categories_group cgs ON cgs.id = s.category_group_id
  LEFT JOIN public.categories_group cgc ON cgc.id = c.category_group_id
  LEFT JOIN LATERAL (
    SELECT sa.street, sa.number, sa.neighborhood, sa.city, sa.state, sa.label, sa.latitude, sa.longitude
    FROM public.service_addresses sa
    WHERE sa.service_id = s.id AND sa.active
    ORDER BY sa.is_primary DESC, sa.id
    LIMIT 1
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT f.answers
    FROM public.form_results f
    WHERE f.domain = 'service' AND f.reference_id = s.id::text
    LIMIT 1
  ) fr ON true
  WHERE s.uid = p_uid
    AND s.active = true
    AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
$function$;

GRANT EXECUTE ON FUNCTION public.fn_map_pins(double precision, double precision, double precision, integer, text[], text[])
  TO anon, auth_user;
GRANT EXECUTE ON FUNCTION public.fn_map_place(uuid)
  TO anon, auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('search', '1.11.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
