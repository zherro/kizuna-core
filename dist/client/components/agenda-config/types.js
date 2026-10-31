/**
 * Shared types + constants for the `agenda` plugin's tenant configuration UI
 * (`agenda_schedule` / `agenda_schedule_hours` / `agenda_booking_preferences` /
 * `agenda_notification_preferences`). Snake_case fields match the resource configs in
 * `screen-engine/resources/agenda-config.ts` 1:1.
 */
export const LUNCH_DAY_OF_WEEK = 9;
/** 0=Sun … 6=Sat, then the lunch sentinel. */
export const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const ALL_DAYS = [...WEEK_DAYS, LUNCH_DAY_OF_WEEK];
export const DAY_LABELS = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
    [LUNCH_DAY_OF_WEEK]: 'Almoço',
};
export const DAY_SHORT = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb',
};
export const DEFAULT_BOOKING_PREFERENCES = {
    booking_window_days: 7,
    client_picks_schedule: false,
    min_advance_hours: 4,
    buffer_minutes: 30,
    service_radius_km: 10,
    auto_accept_trusted: false,
};
export const DEFAULT_NOTIFICATION_PREFERENCES = {
    notify_new_booking: true,
    notify_cancellation: true,
    notify_reminder: true,
    reminder_hours_before: 24,
    channel_email: true,
    channel_push: true,
    channel_whatsapp: false,
};
export function buildDefaultHour(dayOfWeek) {
    if (dayOfWeek === LUNCH_DAY_OF_WEEK) {
        return {
            day_of_week: LUNCH_DAY_OF_WEEK,
            open_time: '12:00',
            close_time: '13:00',
            active: false,
        };
    }
    return {
        day_of_week: dayOfWeek,
        open_time: '08:00',
        close_time: '18:00',
        active: dayOfWeek >= 1 && dayOfWeek <= 5,
    };
}
/** Fill in any missing day rows with defaults, ordered Sun..Sat then lunch. */
export function mergeHoursByDay(hours) {
    const byDay = new Map(hours.map((h) => [h.day_of_week, h]));
    return ALL_DAYS.map((d) => byDay.get(d) ?? buildDefaultHour(d));
}
//# sourceMappingURL=types.js.map