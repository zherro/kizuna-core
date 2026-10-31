import { type ScheduleHourRecord, type ScheduleWithHours } from './types';
/**
 * Loads the tenant's schedules and their weekday rows (two list calls, grouped client-side — no
 * N+1), and persists one schedule at a time as an atomic-ish unit: upsert the `agenda_schedule`
 * row, then upsert its 8 `agenda_schedule_hours` rows. Nothing hits the DB until `saveSchedule`.
 */
export declare function useAgendaSchedules(): {
    schedules: ScheduleWithHours[];
    loading: boolean;
    saving: boolean;
    load: () => Promise<void>;
    saveSchedule: (draft: {
        id?: string;
        name: string;
        timezone: string;
        hours: ScheduleHourRecord[];
    }) => Promise<boolean>;
    setScheduleActive: (id: string, active: boolean) => Promise<boolean>;
    removeSchedule: (id: string) => Promise<boolean>;
    duplicateSchedule: (source: ScheduleWithHours) => Promise<boolean>;
    emptyHours: ScheduleHourRecord[];
};
//# sourceMappingURL=use-agenda-schedules.d.ts.map