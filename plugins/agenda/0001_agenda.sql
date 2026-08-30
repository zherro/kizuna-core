-- plugins/agenda/0001_agenda.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()). Two tables: agenda_events (a user's own calendar events)
-- and agenda_settings (one view-preferences row per user+tenant). Both strictly self-service —
-- same shape as user_data/account_preferences, no admin-facing "manage another user's agenda"
-- capability exists here, so no permission is registered (see plugins/README.md convention).
--
-- "end" is a reserved SQL keyword — quoted everywhere it's declared/referenced, same fix already
-- applied to the `order` column in migrations/0001_initial_schema.sql. Don't drop the quotes.

-- ---------------------------------------------------------------------------------------------
-- 1) agenda_events — a user's own calendar events. calendar_id/resource_id are free-form text
--    (foreign key, not FK'd here — which fixed set of calendars/resources exists is a
--    project-level concern; foco-total keeps its 3 resources as an in-code constant, not a
--    table, see src/lib/server/agenda-constants.ts).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_events (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    user_id      uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    title        text NOT NULL,
    start        timestamptz NOT NULL,
    "end"        timestamptz NOT NULL,
    description  text,
    location     text,
    people       jsonb,
    calendar_id  text NOT NULL,
    resource_id  text,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agenda_events_user_start ON public.agenda_events(user_id, start);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agenda_events TO auth_user;

DROP POLICY IF EXISTS agenda_events_select_policy ON public.agenda_events;
CREATE POLICY agenda_events_select_policy ON public.agenda_events FOR SELECT TO auth_user
USING (user_id = auth.fun_auth_user_id());

DROP POLICY IF EXISTS agenda_events_insert_policy ON public.agenda_events;
CREATE POLICY agenda_events_insert_policy ON public.agenda_events FOR INSERT TO auth_user
WITH CHECK (user_id = auth.fun_auth_user_id());

DROP POLICY IF EXISTS agenda_events_update_policy ON public.agenda_events;
CREATE POLICY agenda_events_update_policy ON public.agenda_events FOR UPDATE TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

DROP POLICY IF EXISTS agenda_events_delete_policy ON public.agenda_events;
CREATE POLICY agenda_events_delete_policy ON public.agenda_events FOR DELETE TO auth_user
USING (user_id = auth.fun_auth_user_id());

-- ---------------------------------------------------------------------------------------------
-- 2) agenda_settings — singleton row per (user_id, tenant_id), same composite-PK-as-uniqueness
--    shape as account_preferences/0001_account_preferences.sql. Columns mirror
--    AgendaSettingsPayload (src/types/agenda.ts) 1:1 so the API layer needs no field mapping
--    beyond camelCase<->snake_case.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_settings (
    user_id                uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id              uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    enabled                boolean NOT NULL DEFAULT true,
    default_view           text NOT NULL DEFAULT 'week'
                           CHECK (default_view IN ('day', 'week', 'month-grid', 'list')),
    timezone               text NOT NULL DEFAULT 'America/Sao_Paulo',
    week_starts_on         text NOT NULL DEFAULT 'monday'
                           CHECK (week_starts_on IN ('monday', 'sunday')),
    show_weekends          boolean NOT NULL DEFAULT true,
    show_decluttered_list  boolean NOT NULL DEFAULT false,
    reminders_enabled      boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_settings_pkey PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.agenda_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_settings TO auth_user;

DROP POLICY IF EXISTS agenda_settings_policy ON public.agenda_settings;
CREATE POLICY agenda_settings_policy ON public.agenda_settings FOR ALL TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

-- Plugin registration (see plugins/README.md convention). No permissions registered: both tables
-- are strictly self-service, same as user_data/account_preferences — no admin override to view
-- or edit another user's events/settings exists here.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('agenda', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
