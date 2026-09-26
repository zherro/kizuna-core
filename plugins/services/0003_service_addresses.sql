-- plugins/services/0003_service_addresses.sql
-- Endereços do serviço (N por serviço): tabela filha `public.service_addresses`, no mesmo padrão
-- de `service_categories_sub` (FK ON DELETE CASCADE, tenant_id/created_by com default de JWT,
-- `active`, GRANTs, NOTIFY pgrst). Idempotente. Consumida por `search`/`swipe` (0002) via um único
-- EXISTS por (state, city_ibge) — nunca expor rua/número em RPC pública.
--
-- Leitura pública SÓ de endereço de serviço ativo e `status = 'active'` (tem rua e número);
-- o dono e quem tem `services:moderate` enxergam também os próprios/pendentes (espelha `services`).

-- =========================================================================
-- 1) Tabela + índices
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.service_addresses (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  service_id    bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  label         text,
  zip_code      varchar(10),
  street        text,
  number        text,
  complement    text,
  neighborhood  text,
  city          text,
  state         varchar(2),
  city_ibge     text,
  latitude      numeric(9,6),
  longitude     numeric(9,6),
  place_id      text,
  is_primary    boolean NOT NULL DEFAULT false,
  tenant_id     uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id(),
  created_by    uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_addresses_service
  ON public.service_addresses (service_id, is_primary DESC) WHERE active;
CREATE INDEX IF NOT EXISTS service_addresses_state_city
  ON public.service_addresses (state, city_ibge) WHERE active;
CREATE INDEX IF NOT EXISTS service_addresses_city
  ON public.service_addresses (city_ibge) WHERE active AND city_ibge IS NOT NULL;
-- No máximo 1 endereço principal ativo por serviço.
CREATE UNIQUE INDEX IF NOT EXISTS service_addresses_one_primary
  ON public.service_addresses (service_id) WHERE is_primary AND active;

-- =========================================================================
-- 2) RLS + GRANTs
-- =========================================================================
ALTER TABLE public.service_addresses ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_addresses TO auth_user;
GRANT DELETE ON TABLE public.service_addresses TO auth_user;
GRANT SELECT ON TABLE public.service_addresses TO anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.service_addresses FROM anon;

DROP POLICY IF EXISTS sa_public_read ON public.service_addresses;
CREATE POLICY sa_public_read ON public.service_addresses FOR SELECT TO anon, auth_user
  USING (active AND EXISTS (
    SELECT 1 FROM public.services s
     WHERE s.id = service_id AND s.active AND s.status = 'active'));

DROP POLICY IF EXISTS sa_owner_write ON public.service_addresses;
CREATE POLICY sa_owner_write ON public.service_addresses FOR ALL TO auth_user
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.created_by = auth.fun_auth_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.created_by = auth.fun_auth_user_id()));

DROP POLICY IF EXISTS sa_moderator_read ON public.service_addresses;
CREATE POLICY sa_moderator_read ON public.service_addresses FOR SELECT TO auth_user
  USING (auth.fun_auth_has_perm('services','moderate'));

-- =========================================================================
-- 3) Backfill idempotente: 1 endereço principal por serviço ativo que ainda não tem nenhum,
--    a partir do user_data do prestador. Só se houver cidade ou UF. lat/lng (varchar) só entram
--    se forem numéricos e dentro da faixa válida.
-- =========================================================================
DO $$
BEGIN
  IF to_regclass('public.user_data') IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.service_addresses
    (service_id, zip_code, city, state, city_ibge, latitude, longitude, is_primary, tenant_id, created_by)
  SELECT
    s.id,
    NULLIF(btrim(prov.zip_code), ''),
    NULLIF(btrim(prov.city), ''),
    NULLIF(btrim(prov.state), ''),
    NULLIF(btrim(prov.city_ibge), ''),
    CASE WHEN btrim(prov.latitude)  ~ '^-?[0-9]{1,2}(\.[0-9]+)?$' AND abs(btrim(prov.latitude)::numeric)  <= 90
         THEN round(btrim(prov.latitude)::numeric, 6) END,
    CASE WHEN btrim(prov.longitude) ~ '^-?[0-9]{1,3}(\.[0-9]+)?$' AND abs(btrim(prov.longitude)::numeric) <= 180
         THEN round(btrim(prov.longitude)::numeric, 6) END,
    true,
    s.tenant_id,
    s.created_by
  FROM public.services s
  CROSS JOIN LATERAL (
    SELECT ud.city, ud.state, ud.city_ibge, ud.zip_code, ud.latitude, ud.longitude
      FROM public.user_data ud
     WHERE ud.tenant_id = s.tenant_id AND ud.active = true
     ORDER BY ud.created_at
     LIMIT 1
  ) prov
  WHERE s.active = true
    AND NOT EXISTS (SELECT 1 FROM public.service_addresses a WHERE a.service_id = s.id)
    AND (NULLIF(btrim(prov.city), '') IS NOT NULL OR NULLIF(btrim(prov.state), '') IS NOT NULL);
END $$;

-- =========================================================================
-- 4) Plugin registration
-- =========================================================================
INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
