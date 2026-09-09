-- plugins/services/0001_services.sql
-- Plugin: services — domínio "marketplace de serviços" (o anúncio de um prestador) + a fila de
-- moderação desse anúncio. Idempotente, from-zero-safe (mesma convenção de plugins/*/0001_*.sql,
-- ver plugins/README.md). NÃO faz ALTER em tabela do projeto consumidor. Depende do plugin
-- `taxonomy` (referencia categories_group/categories por id) e do plugin `storage` (imagens em
-- extras.images apontam pra files, sem FK). Design: foco-total/docs/superpowers/specs/2026-09-09-wizard-engine-plugin-services-design.md

-- =========================================================================
-- 1) Enums
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.price_unit AS ENUM
    ('quote','service','hour','fixed','unit','visit','m2_metro_quadrado','project','package','monthly','day','km');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.service_status AS ENUM ('pending','active','paused','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.service_location AS ENUM ('no_cliente','no_estabelecimento','remoto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 2) Tabelas
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.services (
  id                 bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid                uuid NOT NULL DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  category_group_id  bigint REFERENCES public.categories_group(id),
  category_id        bigint NOT NULL REFERENCES public.categories(id),
  description        text,
  starting_price     numeric NOT NULL DEFAULT 0,
  price_unit         public.price_unit NOT NULL DEFAULT 'quote',
  urgent_available   boolean NOT NULL DEFAULT false,
  extras             jsonb NOT NULL DEFAULT '{}'::jsonb,
  status             public.service_status NOT NULL DEFAULT 'pending',
  sponsored          boolean NOT NULL DEFAULT false,
  service_location   public.service_location,
  tenant_id          uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
  created_by         uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_uid_unique UNIQUE (uid)
);
CREATE INDEX IF NOT EXISTS services_tenant   ON public.services (tenant_id, status) WHERE active;
CREATE INDEX IF NOT EXISTS services_owner    ON public.services (created_by);
CREATE INDEX IF NOT EXISTS services_category ON public.services (category_id) WHERE active;

CREATE TABLE IF NOT EXISTS public.service_categories_sub (
  id                 bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  service_id         bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  category_group_id  bigint NOT NULL REFERENCES public.categories_group(id),
  category_id        bigint NOT NULL REFERENCES public.categories(id),
  category_sub_id    bigint NOT NULL REFERENCES public.categories_sub(id),
  tenant_id          uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id(),
  created_by         uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_categories_sub_unique UNIQUE (service_id, category_sub_id)
);
CREATE INDEX IF NOT EXISTS service_categories_sub_service ON public.service_categories_sub (service_id) WHERE active;

CREATE TABLE IF NOT EXISTS public.service_moderations (
  id                bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uid               uuid NOT NULL DEFAULT gen_random_uuid(),
  service_id        bigint NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  decision          text NOT NULL CHECK (decision IN ('approved','rejected','escalated')),
  decision_note     text,
  rejection_reason  text CHECK (rejection_reason IS NULL OR rejection_reason IN
                      ('inappropriate_content','misleading','duplicate','wrong_category','incomplete','policy_violation','other')),
  priority          smallint NOT NULL DEFAULT 2,
  decided_at        timestamptz NOT NULL DEFAULT now(),
  auto_approved     boolean NOT NULL DEFAULT false,
  tenant_id         uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id(),
  created_by        uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_moderations_uid_unique UNIQUE (uid)
);
CREATE INDEX IF NOT EXISTS service_moderations_service ON public.service_moderations (service_id, decided_at DESC);

-- =========================================================================
-- 3) RLS
-- =========================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.services TO auth_user;
GRANT SELECT ON TABLE public.services TO anon;
REVOKE DELETE ON TABLE public.services FROM auth_user, anon;

DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read ON public.services FOR SELECT TO anon
  USING (active AND status = 'active');

DROP POLICY IF EXISTS services_owner_read ON public.services;
CREATE POLICY services_owner_read ON public.services FOR SELECT TO auth_user
  USING (active AND (created_by = auth.fun_auth_user_id() OR auth.fun_auth_has_perm('services','moderate')
         OR (status = 'active')));

DROP POLICY IF EXISTS services_owner_write ON public.services;
CREATE POLICY services_owner_write ON public.services FOR INSERT TO auth_user
  WITH CHECK (created_by = auth.fun_auth_user_id());

DROP POLICY IF EXISTS services_owner_update ON public.services;
CREATE POLICY services_owner_update ON public.services FOR UPDATE TO auth_user
  USING (created_by = auth.fun_auth_user_id() OR auth.fun_auth_has_perm('services','moderate'))
  WITH CHECK (created_by = auth.fun_auth_user_id() OR auth.fun_auth_has_perm('services','moderate'));

ALTER TABLE public.service_categories_sub ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_categories_sub TO auth_user;
GRANT DELETE ON TABLE public.service_categories_sub TO auth_user;
GRANT SELECT ON TABLE public.service_categories_sub TO anon;
REVOKE DELETE ON TABLE public.service_categories_sub FROM anon;

DROP POLICY IF EXISTS scs_read ON public.service_categories_sub;
CREATE POLICY scs_read ON public.service_categories_sub FOR SELECT USING (true);

DROP POLICY IF EXISTS scs_owner_write ON public.service_categories_sub;
CREATE POLICY scs_owner_write ON public.service_categories_sub FOR ALL TO auth_user
  USING (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.created_by = auth.fun_auth_user_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.created_by = auth.fun_auth_user_id()));

ALTER TABLE public.service_moderations ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.service_moderations TO auth_user;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.service_moderations FROM auth_user, anon;

DROP POLICY IF EXISTS sm_read ON public.service_moderations;
CREATE POLICY sm_read ON public.service_moderations FOR SELECT TO auth_user
  USING (auth.fun_auth_has_perm('services','moderate')
         OR EXISTS (SELECT 1 FROM public.services s WHERE s.id = service_id AND s.created_by = auth.fun_auth_user_id()));

-- =========================================================================
-- 4) RPC — fn_service_moderate: insere a moderação E deriva services.status, atômico.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_service_moderate(
  p_service_id       bigint,
  p_decision         text,
  p_note             text DEFAULT NULL,
  p_rejection_reason text DEFAULT NULL
) RETURNS public.service_moderations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_row    public.service_moderations;
  v_status public.service_status;
BEGIN
  IF NOT auth.fun_auth_has_perm('services','moderate') THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;
  IF p_decision NOT IN ('approved','rejected','escalated') THEN
    RAISE EXCEPTION 'decisão inválida: %', p_decision USING errcode = '22023';
  END IF;

  v_status := CASE p_decision
    WHEN 'approved' THEN 'active'::public.service_status
    WHEN 'rejected' THEN 'archived'::public.service_status
    ELSE 'pending'::public.service_status
  END;

  INSERT INTO public.service_moderations (service_id, decision, decision_note, rejection_reason)
  VALUES (
    p_service_id, p_decision, NULLIF(btrim(coalesce(p_note,'')),''),
    CASE WHEN p_decision = 'rejected' THEN p_rejection_reason ELSE NULL END
  )
  RETURNING * INTO v_row;

  UPDATE public.services SET status = v_status, updated_at = now() WHERE id = p_service_id;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_service_moderate(bigint, text, text, text) TO auth_user;

-- =========================================================================
-- 5) RBAC + registro do plugin
-- =========================================================================
INSERT INTO auth.permissions (resource, action, name) VALUES
  ('services', 'moderate', 'Moderar anúncios de serviço')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
