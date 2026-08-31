-- plugins/holidays/0001_holidays.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id(), auth.fun_auth_has_perm()). Combo plugin, same shape as
-- agenda/0001_agenda.sql: one admin-managed catalog (`holidays`) plus two tenant self-service
-- tables built on top of it (`holidays_tenant` — on/off toggle per catalog entry,
-- `holidays_tenant_custom_days_off` — a tenant's own days off, not from the catalog at all).
--
-- Design notes (see task report for full context):
-- 1) `holidays.tenant_id`/`created_by` are new columns that never existed in foco-total's old
--    migrations/0001_initial_schema.sql, even though db/extras/feriados_nacionais.sql already
--    inserts against them. NULL tenant_id = national/global catalog entry shared by every tenant;
--    a filled tenant_id = a catalog entry a specific tenant added for itself (state/city holiday
--    not worth seeding globally). Both nullable.
-- 2) `holidays_tenant` gains `active` and `created_by` — columns
--    src/lib/server/resources/resource-holidays.ts already selects but that never existed in
--    db/migrations/0004_holidays_tenant.sql. `holidays_tenant_custom_days_off` is redesigned to
--    match that same resource file's `select`/`mapInput` 1:1 (`name`, `recurring`, `description`,
--    `active`, `date_interval`, `date_interval_end`, `deleted`) instead of the old ad-hoc
--    `reason` column, which no code path reads.

-- ---------------------------------------------------------------------------------------------
-- 1) holidays — shared catalog. Readable by any session (same "open read" principle as the
--    taxonomy plugin's categories/categories_sub); writes gated by holidays.manage.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name         text NOT NULL,
    description  text,
    date         date NOT NULL,
    scope        text NOT NULL DEFAULT 'national'
                 CHECK (scope IN ('national', 'state', 'city')),
    state_code   text,
    city_ibge    text,
    recurring    boolean NOT NULL DEFAULT false,
    active       boolean NOT NULL DEFAULT true,
    tenant_id    uuid REFERENCES auth.tenants(uid) ON DELETE CASCADE,
    created_by   uuid REFERENCES auth.users(uid) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_scope ON public.holidays(scope);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_id ON public.holidays(tenant_id);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.holidays TO auth_user, anon;
-- No DELETE — no plugin does physical delete (see plugins/README.md). Removing a catalog entry
-- is a soft delete (`active = false`), already covered by the UPDATE grant/policy below. The
-- REVOKE strips DELETE back off an install from before this change.
GRANT INSERT, UPDATE ON TABLE public.holidays TO auth_user;
REVOKE DELETE ON TABLE public.holidays FROM auth_user;

DROP POLICY IF EXISTS holidays_select_policy ON public.holidays;
CREATE POLICY holidays_select_policy ON public.holidays FOR SELECT TO auth_user, anon
USING (true);

-- Writes gated by the holidays.manage permission (registered below). Nobody is granted it by
-- default — see plugins/README.md convention; root already passes this check via
-- auth.fun_auth_has_perm's is_root bypass, no role_grants row needed.
DROP POLICY IF EXISTS holidays_insert_policy ON public.holidays;
CREATE POLICY holidays_insert_policy ON public.holidays FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('holidays', 'manage'));

DROP POLICY IF EXISTS holidays_update_policy ON public.holidays;
CREATE POLICY holidays_update_policy ON public.holidays FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('holidays', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('holidays', 'manage'));

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS holidays_delete_policy ON public.holidays;

-- ---------------------------------------------------------------------------------------------
-- 2) holidays_tenant — a tenant's on/off preference against a catalog entry. Strictly
--    self-service (a tenant manages only its own rows), no permission gate.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays_tenant (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    holiday_id   uuid NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
    is_off       boolean NOT NULL DEFAULT true,
    active       boolean NOT NULL DEFAULT true,
    created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_tenant_tenant_id ON public.holidays_tenant(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_holiday_id ON public.holidays_tenant(holiday_id);

ALTER TABLE public.holidays_tenant ENABLE ROW LEVEL SECURITY;
-- No DELETE — soft delete (`active = false`) via the UPDATE grant/policy below.
GRANT SELECT, INSERT, UPDATE ON TABLE public.holidays_tenant TO auth_user;
REVOKE DELETE ON TABLE public.holidays_tenant FROM auth_user;

DROP POLICY IF EXISTS holidays_tenant_select_policy ON public.holidays_tenant;
CREATE POLICY holidays_tenant_select_policy ON public.holidays_tenant FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_tenant_insert_policy ON public.holidays_tenant;
CREATE POLICY holidays_tenant_insert_policy ON public.holidays_tenant FOR INSERT TO auth_user
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_tenant_update_policy ON public.holidays_tenant;
CREATE POLICY holidays_tenant_update_policy ON public.holidays_tenant FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS holidays_tenant_delete_policy ON public.holidays_tenant;

-- ---------------------------------------------------------------------------------------------
-- 3) holidays_tenant_custom_days_off — a tenant's own days off, unrelated to the catalog.
--    Columns mirror resource-holidays.ts's `holidays_tenant_custom_days_off` select/mapInput 1:1
--    (see design note 2 above) instead of the old migrations/0004 shape (`reason`, no soft
--    delete, no interval). Strictly self-service, no permission gate.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays_tenant_custom_days_off (
    id                  uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    name                text NOT NULL,
    date                date NOT NULL,
    date_interval       boolean NOT NULL DEFAULT false,
    date_interval_end   date,
    recurring           boolean NOT NULL DEFAULT false,
    description         text,
    active              boolean NOT NULL DEFAULT true,
    deleted             boolean NOT NULL DEFAULT false,
    created_by          uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    created_at          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_days_off_tenant_id ON public.holidays_tenant_custom_days_off(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_days_off_date ON public.holidays_tenant_custom_days_off(date);

ALTER TABLE public.holidays_tenant_custom_days_off ENABLE ROW LEVEL SECURITY;
-- No DELETE — soft delete (`active`/`deleted`, both already columns here) via the UPDATE
-- grant/policy below.
GRANT SELECT, INSERT, UPDATE ON TABLE public.holidays_tenant_custom_days_off TO auth_user;
REVOKE DELETE ON TABLE public.holidays_tenant_custom_days_off FROM auth_user;

DROP POLICY IF EXISTS holidays_custom_days_off_select_policy ON public.holidays_tenant_custom_days_off;
CREATE POLICY holidays_custom_days_off_select_policy ON public.holidays_tenant_custom_days_off FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_custom_days_off_insert_policy ON public.holidays_tenant_custom_days_off;
CREATE POLICY holidays_custom_days_off_insert_policy ON public.holidays_tenant_custom_days_off FOR INSERT TO auth_user
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_custom_days_off_update_policy ON public.holidays_tenant_custom_days_off;
CREATE POLICY holidays_custom_days_off_update_policy ON public.holidays_tenant_custom_days_off FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS holidays_custom_days_off_delete_policy ON public.holidays_tenant_custom_days_off;

-- Plugin registration + RBAC wiring (see plugins/README.md convention). holidays.manage is
-- registered in the catalog only — no role gets it automatically. Root already passes
-- auth.fun_auth_has_perm for it via the is_root bypass; granting it to a tenant role (or any
-- other role) is left to whoever installs/administers the consuming project.
-- holidays_tenant/holidays_tenant_custom_days_off stay self-service only (no admin permission —
-- a tenant's own calendar isn't something an admin edits here).
INSERT INTO auth.permissions (resource, action, name)
VALUES ('holidays', 'manage', 'Gerenciar catálogo de feriados')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('holidays', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
