-- plugins/agenda/0003_agenda_rbac_policies.sql
-- Follow-up to 0001 (agenda_events, agenda_settings) — adds the admin-override clause now that
-- `agenda.manage` is registered in the catalog (see foco-total's
-- db/migrations/0002_rbac_app_permissions.sql). Previously these two tables were strictly
-- self-service (user_id = auth.fun_auth_user_id() only, no admin bypass at all). This migration
-- widens SELECT/INSERT/UPDATE on both to also allow a caller holding `agenda.manage` — e.g. a
-- tenant admin auditing/managing another user's calendar.
--
-- Does NOT touch agenda_schedule / agenda_schedule_hours / agenda_booking_preferences /
-- agenda_notification_preferences (0002_agenda_config.sql) — those are tenant_id-scoped, not
-- user_id-scoped (every tenant member with baseline access already sees the whole tenant's
-- schedule config), so there is no per-user boundary for `agenda.manage` to override.
--
-- Idempotent: DROP POLICY IF EXISTS before every CREATE POLICY, same convention as 0001/0002.
-- Only widens existing predicates with an `OR auth.fun_auth_has_perm(...)` clause — never
-- loosens/removes the base `user_id = auth.fun_auth_user_id()` check.

-- ---------------------------------------------------------------------------------------------
-- 1) agenda_events
-- ---------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS agenda_events_select_policy ON public.agenda_events;
CREATE POLICY agenda_events_select_policy ON public.agenda_events FOR SELECT TO auth_user
USING (
    user_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('agenda', 'manage')
);

DROP POLICY IF EXISTS agenda_events_insert_policy ON public.agenda_events;
CREATE POLICY agenda_events_insert_policy ON public.agenda_events FOR INSERT TO auth_user
WITH CHECK (
    user_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('agenda', 'manage')
);

DROP POLICY IF EXISTS agenda_events_update_policy ON public.agenda_events;
CREATE POLICY agenda_events_update_policy ON public.agenda_events FOR UPDATE TO auth_user
USING (
    user_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('agenda', 'manage')
)
WITH CHECK (
    user_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('agenda', 'manage')
);

-- ---------------------------------------------------------------------------------------------
-- 2) agenda_settings — single FOR ALL policy in 0001; split predicate stays the same shape
--    (USING covers SELECT/UPDATE/DELETE, WITH CHECK covers INSERT/UPDATE). No DELETE is granted
--    to auth_user on this table (see 0001 GRANT list), so this only ever gates
--    SELECT/INSERT/UPDATE in practice.
-- ---------------------------------------------------------------------------------------------
DROP POLICY IF EXISTS agenda_settings_policy ON public.agenda_settings;
CREATE POLICY agenda_settings_policy ON public.agenda_settings FOR ALL TO auth_user
USING (
    user_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('agenda', 'manage')
)
WITH CHECK (
    user_id = auth.fun_auth_user_id()
    OR auth.fun_auth_has_perm('agenda', 'manage')
);

-- ---------------------------------------------------------------------------------------------
-- Plugin registration — bump agenda 1.1.0 -> 1.1.1 (RLS-only change, no schema change).
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.plugin_registry (name, version)
VALUES ('agenda', '1.1.1')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
