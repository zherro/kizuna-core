-- plugins/agenda/0004_agenda_availability.sql
-- Follow-up migration for the `agenda` plugin (0001 = agenda_events/agenda_settings, 0002 =
-- agenda_schedule/*_hours/*_preferences, 0003 = RBAC admin-override policies — a separate,
-- concurrent workstream; not touched here). Adds:
--
--   1. `agenda_schedule.metadata` (jsonb) — free-form room for a schedule to carry tags/links
--      later (e.g. `{tags: [...], links: {...}}`) without another migration. No consumer reads
--      it yet; this just opens the column up front, same idea as `services.extras`.
--   2. `fn_agenda_availability(p_schedule_id, p_date, p_slot_minutes)` — computes free booking
--      slots for one schedule on one calendar day: the day's open/close window from
--      `agenda_schedule_hours` (day_of_week 0-6), minus the lunch window (day_of_week = 9
--      sentinel, same convention as 0002), minus any day the tenant has marked off
--      (`holidays_tenant.is_off` / `holidays_tenant_custom_days_off`), minus already-booked
--      `agenda_events` (padded by `agenda_booking_preferences.buffer_minutes`), and dropping any
--      slot that starts before `now() + min_advance_hours`.
--
-- Tenant scoping: the function takes NO tenant id argument. Like every other SECURITY DEFINER
-- RPC in this plugin (fn_msg_* in the messaging plugin is the model), it derives the caller's
-- tenant from the JWT via auth.fun_auth_current_tenant_id() — a client can never pass its own
-- tenant_id and read/compute another tenant's availability. `p_schedule_id` is still checked
-- against that tenant below (a schedule id from another tenant returns an empty set, not an
-- error, so the function can't be used to probe which ids exist).
--
-- Known gap (documented, not solved here — out of scope for this migration): `agenda_events` has
-- no `schedule_id` column (0001 predates 0002's schedules and only knows free-form
-- `resource_id` text). There is therefore no way yet to know which events belong to which named
-- schedule. Until a consuming project adds that FK (see the note already in 0002 about
-- `services.schedule_id` living in the project, not the plugin), this function treats every
-- active `agenda_events` row for the tenant as occupying time on every schedule — i.e. it blocks
-- slots tenant-wide, not per-schedule. Safe (never over-promises a slot that's actually booked
-- elsewhere), just coarser than per-schedule until that FK exists.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS; CREATE OR REPLACE FUNCTION; DROP FUNCTION IF EXISTS with
-- the old signature first (harmless no-op on a fresh install).

-- ---------------------------------------------------------------------------------------------
-- 1) agenda_schedule.metadata — reserved jsonb for future tags/links, mirrors how `services`
--    keeps `extras` for exactly this purpose. Empty object default so callers never see NULL.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.agenda_schedule
    ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------------------------
-- 2) fn_agenda_availability — free slots for (my tenant's) schedule on a given day.
-- ---------------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.fn_agenda_availability(uuid, date, integer);

CREATE OR REPLACE FUNCTION public.fn_agenda_availability(
    p_schedule_id  uuid,
    p_date         date,
    p_slot_minutes integer DEFAULT 30
)
RETURNS TABLE(slot_start timestamptz, slot_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_tenant_id       uuid := auth.fun_auth_current_tenant_id();
    v_timezone        text;
    v_day_of_week     smallint;
    v_open_time       time;
    v_close_time      time;
    v_lunch_open      time;
    v_lunch_close     time;
    v_window_start    timestamptz;
    v_window_end      timestamptz;
    v_lunch_start     timestamptz;
    v_lunch_end       timestamptz;
    v_min_advance_h   integer := 4;
    v_buffer_minutes  integer := 30;
    v_not_before      timestamptz;
    v_is_holiday      boolean;
BEGIN
    IF p_schedule_id IS NULL OR p_date IS NULL THEN
        RETURN;
    END IF;

    IF p_slot_minutes IS NULL OR p_slot_minutes <= 0 THEN
        p_slot_minutes := 30;
    END IF;

    -- Schedule must belong to the caller's tenant, be enabled and not soft-deleted. Any mismatch
    -- (wrong tenant, disabled, deleted, unknown id) yields zero rows rather than an error.
    SELECT s.timezone
      INTO v_timezone
      FROM public.agenda_schedule s
     WHERE s.id = p_schedule_id
       AND s.tenant_id = v_tenant_id
       AND s.active = true
       AND s.deleted = false;

    IF v_timezone IS NULL THEN
        RETURN;
    END IF;

    -- Tenant marked this date off (recurring national/state/city holiday accepted for the
    -- tenant, or an ad-hoc custom day off / range) => no slots at all.
    v_day_of_week := EXTRACT(DOW FROM p_date)::smallint; -- 0 = Sunday .. 6 = Saturday

    SELECT EXISTS (
        SELECT 1
          FROM public.holidays_tenant ht
          JOIN public.holidays h ON h.id = ht.holiday_id AND h.active = true
         WHERE ht.tenant_id = v_tenant_id
           AND ht.is_off = true
           AND (
                (h.recurring AND to_char(h.date, 'MM-DD') = to_char(p_date, 'MM-DD'))
             OR (NOT h.recurring AND h.date = p_date)
           )
    )
    OR EXISTS (
        SELECT 1
          FROM public.holidays_tenant_custom_days_off cdo
         WHERE cdo.tenant_id = v_tenant_id
           AND cdo.active = true
           AND cdo.deleted = false
           AND (
                (cdo.date_interval AND p_date BETWEEN cdo.date AND COALESCE(cdo.date_interval_end, cdo.date))
             OR (NOT cdo.date_interval AND cdo.recurring AND to_char(cdo.date, 'MM-DD') = to_char(p_date, 'MM-DD'))
             OR (NOT cdo.date_interval AND NOT cdo.recurring AND cdo.date = p_date)
           )
    )
    INTO v_is_holiday;

    IF v_is_holiday THEN
        RETURN;
    END IF;

    -- The day's open/close window (day_of_week 0-6). No active row for this weekday => closed.
    SELECT sh.open_time, sh.close_time
      INTO v_open_time, v_close_time
      FROM public.agenda_schedule_hours sh
     WHERE sh.schedule_id = p_schedule_id
       AND sh.day_of_week = v_day_of_week
       AND sh.active = true;

    IF v_open_time IS NULL OR v_close_time IS NULL THEN
        RETURN;
    END IF;

    -- Lunch break sentinel (day_of_week = 9), same window applied to every active day.
    SELECT sh.open_time, sh.close_time
      INTO v_lunch_open, v_lunch_close
      FROM public.agenda_schedule_hours sh
     WHERE sh.schedule_id = p_schedule_id
       AND sh.day_of_week = 9
       AND sh.active = true;

    -- open_time > close_time is legal (crosses midnight) — push the close boundary to the next
    -- calendar day in that case, same convention documented in 0002.
    v_window_start := (p_date + v_open_time) AT TIME ZONE v_timezone;
    v_window_end := (
        CASE WHEN v_close_time > v_open_time THEN p_date ELSE p_date + 1 END + v_close_time
    ) AT TIME ZONE v_timezone;

    IF v_lunch_open IS NOT NULL AND v_lunch_close IS NOT NULL THEN
        v_lunch_start := (p_date + v_lunch_open) AT TIME ZONE v_timezone;
        v_lunch_end := (
            CASE WHEN v_lunch_close > v_lunch_open THEN p_date ELSE p_date + 1 END + v_lunch_close
        ) AT TIME ZONE v_timezone;
    END IF;

    -- Booking preferences (singleton per tenant) — defaults above cover a tenant with no row yet.
    SELECT bp.min_advance_hours, bp.buffer_minutes
      INTO v_min_advance_h, v_buffer_minutes
      FROM public.agenda_booking_preferences bp
     WHERE bp.tenant_id = v_tenant_id;

    v_min_advance_h := COALESCE(v_min_advance_h, 4);
    v_buffer_minutes := COALESCE(v_buffer_minutes, 30);
    v_not_before := now() + make_interval(hours => v_min_advance_h);

    -- Candidate slots at p_slot_minutes granularity across the open window, dropped when they:
    --  - overlap the lunch break,
    --  - overlap an already-booked event for the tenant (padded by buffer_minutes on each side —
    --    see the 0004 header note on why this is tenant-wide, not schedule-scoped, for now),
    --  - or start before the minimum-advance cutoff.
    RETURN QUERY
    WITH candidates AS (
        SELECT
            g AS c_start,
            g + make_interval(mins => p_slot_minutes) AS c_end
          FROM generate_series(
                 v_window_start,
                 v_window_end - make_interval(mins => p_slot_minutes),
                 make_interval(mins => p_slot_minutes)
               ) AS g
    )
    SELECT c.c_start, c.c_end
      FROM candidates c
     WHERE c.c_start >= v_not_before
       AND (
            v_lunch_start IS NULL
         OR c.c_end <= v_lunch_start
         OR c.c_start >= v_lunch_end
       )
       AND NOT EXISTS (
            SELECT 1
              FROM public.agenda_events ev
             WHERE ev.tenant_id = v_tenant_id
               AND ev.active = true
               AND c.c_start < ev."end" + make_interval(mins => v_buffer_minutes)
               AND c.c_end > ev.start - make_interval(mins => v_buffer_minutes)
       )
     ORDER BY c.c_start;
END;
$function$;

-- SECURITY DEFINER owns the schema-qualified lookups above; only auth_user may call it (same as
-- every other fn_* in this plugin family — no anon grant, availability is a logged-in tenant
-- concern, not a public marketplace read).
GRANT EXECUTE ON FUNCTION public.fn_agenda_availability(uuid, date, integer) TO auth_user;

NOTIFY pgrst, 'reload schema';
