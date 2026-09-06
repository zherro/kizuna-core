/**
 * Shared types + constants for the `agenda` plugin's tenant configuration UI
 * (`agenda_schedule` / `agenda_schedule_hours` / `agenda_booking_preferences` /
 * `agenda_notification_preferences`). Snake_case fields match the resource configs in
 * `screen-engine/resources/agenda-config.ts` 1:1.
 */
export declare const LUNCH_DAY_OF_WEEK = 9;
/** 0=Sun … 6=Sat, then the lunch sentinel. */
export declare const WEEK_DAYS: readonly [0, 1, 2, 3, 4, 5, 6];
export declare const ALL_DAYS: readonly [0, 1, 2, 3, 4, 5, 6, 9];
export declare const DAY_LABELS: Record<number, string>;
export declare const DAY_SHORT: Record<number, string>;
export type ScheduleRecord = {
    id?: string;
    name: string;
    timezone: string;
    active: boolean;
};
export type ScheduleHourRecord = {
    id?: string;
    schedule_id?: string;
    day_of_week: number;
    open_time: string;
    close_time: string;
    active: boolean;
};
export type ScheduleWithHours = ScheduleRecord & {
    id: string;
    hours: ScheduleHourRecord[];
};
export type BookingPreferences = {
    id?: string;
    booking_window_days: number;
    client_picks_schedule: boolean;
    min_advance_hours: number;
    buffer_minutes: number;
    service_radius_km: number;
    auto_accept_trusted: boolean;
};
export type AgendaNotificationPreferences = {
    id?: string;
    notify_new_booking: boolean;
    notify_cancellation: boolean;
    notify_reminder: boolean;
    reminder_hours_before: number;
    channel_email: boolean;
    channel_push: boolean;
    channel_whatsapp: boolean;
};
export declare const DEFAULT_BOOKING_PREFERENCES: BookingPreferences;
export declare const DEFAULT_NOTIFICATION_PREFERENCES: AgendaNotificationPreferences;
export declare function buildDefaultHour(dayOfWeek: number): ScheduleHourRecord;
/** Fill in any missing day rows with defaults, ordered Sun..Sat then lunch. */
export declare function mergeHoursByDay(hours: ScheduleHourRecord[]): ScheduleHourRecord[];
//# sourceMappingURL=types.d.ts.map