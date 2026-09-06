/**
 * Pure helpers for turning a schedule's weekday rows into human strings — a compact card
 * summary, a suggested name, and client-side validation. No React, no I/O: unit-testable on
 * their own (foco-total's vitest covers these, same as the `reviews` resource configs).
 */
import { type ScheduleHourRecord } from './types';
export declare function hmToMinutes(value: string): number;
/** true when end is strictly before start — the period wraps past midnight (e.g. 22:00→02:00). */
export declare function crossesMidnight(open: string, close: string): boolean;
type ValidationResult = {
    ok: true;
} | {
    ok: false;
    message: string;
};
export declare function validateSchedule(name: string, hours: ScheduleHourRecord[]): ValidationResult;
declare function groupConsecutive(days: number[]): number[][];
/** e.g. "Seg–Sex · 08:00–18:00 · almoço 12:00–13:00" or "Sem dias ativos". */
export declare function summarizeSchedule(hours: ScheduleHourRecord[]): string;
/** Suggested name from the shape of the week — always editable by the user. */
export declare function suggestScheduleName(hours: ScheduleHourRecord[]): string;
export declare const _internal: {
    groupConsecutive: typeof groupConsecutive;
    WEEK_DAYS: readonly [0, 1, 2, 3, 4, 5, 6];
};
export {};
//# sourceMappingURL=schedule-summary.d.ts.map