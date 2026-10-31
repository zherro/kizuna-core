-- plugins/agenda/0002_agenda_config.sql
-- Follow-up migration for the `agenda` plugin (0001 created agenda_events + agenda_settings).
-- Adds the tenant's *schedule configuration*: named weekly schedules ("Comercial", "Fim de
-- semana"…), one set of weekday rows per schedule, plus two per-tenant singletons — booking
-- rules and agenda notification preferences.
--
-- Depends only on core (auth.tenants, auth.users, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()). Strictly self-service, same as agenda_settings — a tenant
-- manages only its own rows, no admin "manage another tenant's schedule" capability exists, so
-- no permission is registered (see plugins/README.md convention).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before every CREATE POLICY.
-- No plugin does physical DELETE (see plugins/README.md) — removing a schedule is a soft delete
-- (`active = false`); the REVOKE strips DELETE back off an install from before this file.

-- ---------------------------------------------------------------------------------------------
-- 1) agenda_schedule — a named weekly schedule. N per tenant. A consuming project points its
--    own domain rows at one of these (e.g. foco-total adds services.schedule_id — an FK that
--    lives in the project, not here: this plugin knows nothing about "services").
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_schedule (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    name         text NOT NULL,
    timezone     text NOT NULL DEFAULT 'America/Sao_Paulo',
    -- `active` = the enable/disable toggle (a disabled schedule stays visible, greyed out).
    -- `deleted` = soft delete (the row disappears from every read; see softDeleteField in the
    -- resource config). No plugin does physical DELETE.
    active       boolean NOT NULL DEFAULT true,
    deleted      boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.agenda_schedule ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agenda_schedule_tenant ON public.agenda_schedule(tenant_id) WHERE NOT deleted;

ALTER TABLE public.agenda_schedule ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_schedule TO auth_user;
REVOKE DELETE ON TABLE public.agenda_schedule FROM auth_user;

DROP POLICY IF EXISTS agenda_schedule_select_policy ON public.agenda_schedule;
CREATE POLICY agenda_schedule_select_policy ON public.agenda_schedule FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_insert_policy ON public.agenda_schedule;
CREATE POLICY agenda_schedule_insert_policy ON public.agenda_schedule FOR INSERT TO auth_user
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_update_policy ON public.agenda_schedule;
CREATE POLICY agenda_schedule_update_policy ON public.agenda_schedule FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_delete_policy ON public.agenda_schedule;

-- ---------------------------------------------------------------------------------------------
-- 2) agenda_schedule_hours — weekday rows for one schedule. Fixed small set per schedule:
--    day_of_week 0..6 (Sun..Sat) plus the sentinel 9 = lunch break (same window shape, applied
--    across every active day — mirrors foco-total's original LUNCH_DAY_OF_WEEK convention).
--    One row per (schedule_id, day_of_week); the client upserts (POST new / PATCH existing),
--    never deletes.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_schedule_hours (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id  uuid NOT NULL REFERENCES public.agenda_schedule(id) ON DELETE CASCADE,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week = 9),
    open_time    time NOT NULL,
    close_time   time NOT NULL,
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_schedule_hours_unique UNIQUE (schedule_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_agenda_schedule_hours_schedule ON public.agenda_schedule_hours(schedule_id);

ALTER TABLE public.agenda_schedule_hours ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_schedule_hours TO auth_user;
REVOKE DELETE ON TABLE public.agenda_schedule_hours FROM auth_user;

DROP POLICY IF EXISTS agenda_schedule_hours_select_policy ON public.agenda_schedule_hours;
CREATE POLICY agenda_schedule_hours_select_policy ON public.agenda_schedule_hours FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_hours_insert_policy ON public.agenda_schedule_hours;
CREATE POLICY agenda_schedule_hours_insert_policy ON public.agenda_schedule_hours FOR INSERT TO auth_user
WITH CHECK (
    tenant_id = auth.fun_auth_current_tenant_id()
    AND EXISTS (
        SELECT 1 FROM public.agenda_schedule s
        WHERE s.id = schedule_id AND s.tenant_id = auth.fun_auth_current_tenant_id()
    )
);

DROP POLICY IF EXISTS agenda_schedule_hours_update_policy ON public.agenda_schedule_hours;
CREATE POLICY agenda_schedule_hours_update_policy ON public.agenda_schedule_hours FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_hours_delete_policy ON public.agenda_schedule_hours;

-- ---------------------------------------------------------------------------------------------
-- 3) agenda_booking_preferences — per-tenant singleton (UNIQUE tenant_id). Keeps a surrogate
--    `id` so the generic /api/resources route and useTenantResource (POST-then-PATCH) work
--    unchanged. Carries foco-total's original business_preferences fields 1:1.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_booking_preferences (
    id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id             uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by            uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    booking_window_days   integer NOT NULL DEFAULT 7,
    client_picks_schedule boolean NOT NULL DEFAULT false,
    min_advance_hours     integer NOT NULL DEFAULT 4,
    buffer_minutes        integer NOT NULL DEFAULT 30,
    service_radius_km     integer NOT NULL DEFAULT 10,
    auto_accept_trusted   boolean NOT NULL DEFAULT false,
    active                boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_booking_preferences_tenant_unique UNIQUE (tenant_id)
);

ALTER TABLE public.agenda_booking_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_booking_preferences TO auth_user;

DROP POLICY IF EXISTS agenda_booking_preferences_policy ON public.agenda_booking_preferences;
CREATE POLICY agenda_booking_preferences_policy ON public.agenda_booking_preferences FOR ALL TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- ---------------------------------------------------------------------------------------------
-- 4) agenda_notification_preferences — per-tenant singleton. What/when/how the tenant is
--    notified about agenda activity. Mechanism only: which channels actually deliver is the
--    consuming project's concern (foco-total wires these to the `notifications`/email layers).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_notification_preferences (
    id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id             uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by            uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    notify_new_booking    boolean NOT NULL DEFAULT true,
    notify_cancellation   boolean NOT NULL DEFAULT true,
    notify_reminder       boolean NOT NULL DEFAULT true,
    reminder_hours_before integer NOT NULL DEFAULT 24,
    channel_email         boolean NOT NULL DEFAULT true,
    channel_push          boolean NOT NULL DEFAULT true,
    channel_whatsapp      boolean NOT NULL DEFAULT false,
    active                boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_notification_preferences_tenant_unique UNIQUE (tenant_id)
);

ALTER TABLE public.agenda_notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_notification_preferences TO auth_user;

DROP POLICY IF EXISTS agenda_notification_preferences_policy ON public.agenda_notification_preferences;
CREATE POLICY agenda_notification_preferences_policy ON public.agenda_notification_preferences FOR ALL TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- ---------------------------------------------------------------------------------------------
-- Plugin registration — bump agenda 1.0.0 -> 1.1.0. No permissions registered (self-service).
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.plugin_registry (name, version)
VALUES ('agenda', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
