/**
 * Server-side `postgrestResources` configs for the `agenda` plugin's *configuration* tables
 * (plugins/agenda/0002_agenda_config.sql): named weekly schedules, their weekday rows, and the
 * two per-tenant singletons (booking rules + notification preferences).
 *
 * Shaped to be spread straight into a consuming project's `postgrestResources` registry — the
 * same contract as `resourceForms` / `resourceReviews`. Everything is snake_case in and out
 * (no camelCase mapping): the tenant config UI (`components/agenda-config/`) and
 * `useTenantResource` consume these column names directly, matching foco-total's original
 * `business_hours` / `business_preferences` configs.
 *
 * `tenant_id` / `created_by` are resolved by column DEFAULT from the JWT (see the plugin SQL) —
 * never sent by the client, never in `mapInput`.
 *
 * Local `PostgrestResourceConfig` type mirrors foco-total's `ResourceConfig`
 * (`src/lib/server/resources/resource-types.ts`) structurally so kizuna-core type-checks it
 * without importing from a consumer. Same approach as `resources/forms.ts`.
 */

export type PostgrestResourceConfig = {
  schema?: string;
  table: string;
  listRequiresAuth?: boolean;
  returnRepresentation?: boolean;
  returnCountPreferDisabled?: boolean;
  select: string;
  primaryKey: string;
  defaultOrder?: string;
  searchableColumns: string[];
  maxPageSize?: number;
  requiredFields?: string[];
  softDeleteField?: string;
  mapInput?: (input: Record<string, unknown>) => Record<string, unknown>;
  mapOutput?: (record: Record<string, unknown>) => Record<string, unknown>;
};

function toBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const n = value.trim().toLowerCase();
    return n === '1' || n === 'true' || n === 't';
  }
  return fallback;
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

/** "08:00:00" | "08:00" | Date-ish -> "HH:MM"; empty -> fallback. */
function toHm(value: unknown, fallback = '00:00'): string {
  const s = String(value ?? '').trim();
  if (!s) return fallback;
  const m = /^(\d{1,2}):(\d{2})/.exec(s);
  if (!m) return fallback;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

// ---------------------------------------------------------------------------------------------
// agenda_schedule — a named weekly schedule (N per tenant). `active` = enable/disable toggle
// (stays visible); DELETE is a soft delete on `deleted` (physical DELETE is revoked in SQL).
// ---------------------------------------------------------------------------------------------
export const AGENDA_SCHEDULE_RESOURCE: PostgrestResourceConfig = {
  schema: 'public',
  table: 'agenda_schedule',
  returnRepresentation: true,
  select: 'id,name,timezone,active,deleted,tenant_id,created_by,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: ['name'],
  requiredFields: ['name'],
  softDeleteField: 'deleted',
  mapInput: (input) => {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) payload.name = String(input.name ?? '').trim();
    if (input.timezone !== undefined) {
      payload.timezone = String(input.timezone ?? '').trim() || 'America/Sao_Paulo';
    }
    if (input.active !== undefined) payload.active = toBool(input.active, true);
    return payload;
  },
  mapOutput: (record) => ({
    id: record.id,
    name: String(record.name ?? ''),
    timezone: String(record.timezone ?? 'America/Sao_Paulo'),
    active: toBool(record.active, true),
    deleted: toBool(record.deleted, false),
    tenant_id: record.tenant_id,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }),
};

// ---------------------------------------------------------------------------------------------
// agenda_schedule_hours — weekday rows for one schedule. day_of_week 0..6, 9 = lunch sentinel.
// Client upserts (POST new / PATCH existing), keyed by (schedule_id, day_of_week).
// ---------------------------------------------------------------------------------------------
export const AGENDA_SCHEDULE_HOURS_RESOURCE: PostgrestResourceConfig = {
  schema: 'public',
  table: 'agenda_schedule_hours',
  returnRepresentation: true,
  select: 'id,schedule_id,day_of_week,open_time,close_time,active,tenant_id,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'day_of_week',
  searchableColumns: [],
  requiredFields: ['schedule_id', 'day_of_week', 'open_time', 'close_time'],
  maxPageSize: 200,
  mapInput: (input) => {
    const payload: Record<string, unknown> = {};
    if (input.schedule_id !== undefined)
      payload.schedule_id = String(input.schedule_id ?? '') || null;
    if (input.day_of_week !== undefined) payload.day_of_week = toInt(input.day_of_week, 0);
    if (input.open_time !== undefined) payload.open_time = toHm(input.open_time, '08:00');
    if (input.close_time !== undefined) payload.close_time = toHm(input.close_time, '18:00');
    if (input.active !== undefined) payload.active = toBool(input.active, true);
    return payload;
  },
  mapOutput: (record) => ({
    id: record.id,
    schedule_id: record.schedule_id,
    day_of_week: toInt(record.day_of_week, 0),
    open_time: toHm(record.open_time, '08:00'),
    close_time: toHm(record.close_time, '18:00'),
    active: toBool(record.active, true),
    tenant_id: record.tenant_id,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }),
};

// ---------------------------------------------------------------------------------------------
// agenda_booking_preferences — per-tenant singleton. `if (x !== undefined)` in mapInput so a
// partial PATCH from one section doesn't reset the others (read-merge-write also applies).
// ---------------------------------------------------------------------------------------------
export const AGENDA_BOOKING_PREFERENCES_RESOURCE: PostgrestResourceConfig = {
  schema: 'public',
  table: 'agenda_booking_preferences',
  returnRepresentation: true,
  select:
    'id,booking_window_days,client_picks_schedule,min_advance_hours,buffer_minutes,service_radius_km,auto_accept_trusted,active,tenant_id,created_by,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: [],
  mapInput: (input) => {
    const payload: Record<string, unknown> = {};
    if (input.booking_window_days !== undefined)
      payload.booking_window_days = toInt(input.booking_window_days, 7);
    if (input.client_picks_schedule !== undefined)
      payload.client_picks_schedule = toBool(input.client_picks_schedule, false);
    if (input.min_advance_hours !== undefined)
      payload.min_advance_hours = toInt(input.min_advance_hours, 4);
    if (input.buffer_minutes !== undefined)
      payload.buffer_minutes = toInt(input.buffer_minutes, 30);
    if (input.service_radius_km !== undefined)
      payload.service_radius_km = toInt(input.service_radius_km, 10);
    if (input.auto_accept_trusted !== undefined)
      payload.auto_accept_trusted = toBool(input.auto_accept_trusted, false);
    return payload;
  },
  mapOutput: (record) => ({
    id: record.id,
    booking_window_days: toInt(record.booking_window_days, 7),
    client_picks_schedule: toBool(record.client_picks_schedule, false),
    min_advance_hours: toInt(record.min_advance_hours, 4),
    buffer_minutes: toInt(record.buffer_minutes, 30),
    service_radius_km: toInt(record.service_radius_km, 10),
    auto_accept_trusted: toBool(record.auto_accept_trusted, false),
    active: toBool(record.active, true),
    tenant_id: record.tenant_id,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }),
};

// ---------------------------------------------------------------------------------------------
// agenda_notification_preferences — per-tenant singleton.
// ---------------------------------------------------------------------------------------------
export const AGENDA_NOTIFICATION_PREFERENCES_RESOURCE: PostgrestResourceConfig = {
  schema: 'public',
  table: 'agenda_notification_preferences',
  returnRepresentation: true,
  select:
    'id,notify_new_booking,notify_cancellation,notify_reminder,reminder_hours_before,channel_email,channel_push,channel_whatsapp,active,tenant_id,created_by,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: [],
  mapInput: (input) => {
    const payload: Record<string, unknown> = {};
    if (input.notify_new_booking !== undefined)
      payload.notify_new_booking = toBool(input.notify_new_booking, true);
    if (input.notify_cancellation !== undefined)
      payload.notify_cancellation = toBool(input.notify_cancellation, true);
    if (input.notify_reminder !== undefined)
      payload.notify_reminder = toBool(input.notify_reminder, true);
    if (input.reminder_hours_before !== undefined)
      payload.reminder_hours_before = toInt(input.reminder_hours_before, 24);
    if (input.channel_email !== undefined)
      payload.channel_email = toBool(input.channel_email, true);
    if (input.channel_push !== undefined) payload.channel_push = toBool(input.channel_push, true);
    if (input.channel_whatsapp !== undefined)
      payload.channel_whatsapp = toBool(input.channel_whatsapp, false);
    return payload;
  },
  mapOutput: (record) => ({
    id: record.id,
    notify_new_booking: toBool(record.notify_new_booking, true),
    notify_cancellation: toBool(record.notify_cancellation, true),
    notify_reminder: toBool(record.notify_reminder, true),
    reminder_hours_before: toInt(record.reminder_hours_before, 24),
    channel_email: toBool(record.channel_email, true),
    channel_push: toBool(record.channel_push, true),
    channel_whatsapp: toBool(record.channel_whatsapp, false),
    active: toBool(record.active, true),
    tenant_id: record.tenant_id,
    created_by: record.created_by,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }),
};

export const resourceAgendaConfig: Record<string, PostgrestResourceConfig> = {
  agenda_schedule: AGENDA_SCHEDULE_RESOURCE,
  agenda_schedule_hours: AGENDA_SCHEDULE_HOURS_RESOURCE,
  agenda_booking_preferences: AGENDA_BOOKING_PREFERENCES_RESOURCE,
  agenda_notification_preferences: AGENDA_NOTIFICATION_PREFERENCES_RESOURCE,
};
