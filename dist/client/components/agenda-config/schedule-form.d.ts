import { type ScheduleHourRecord } from './types';
type ScheduleFormProps = {
    name: string;
    onNameChange: (value: string) => void;
    hours: ScheduleHourRecord[];
    onHoursChange: (next: ScheduleHourRecord[]) => void;
    errorMessage?: string | null;
};
/**
 * The schedule editor body rendered inside the side Sheet: name + one `ScheduleRow` per weekday
 * + the lunch row. Purely controlled — the Sheet owns the draft state and persistence.
 */
export declare function ScheduleForm({ name, onNameChange, hours, onHoursChange, errorMessage, }: Readonly<ScheduleFormProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=schedule-form.d.ts.map