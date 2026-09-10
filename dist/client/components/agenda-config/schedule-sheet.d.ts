import { type ScheduleHourRecord, type ScheduleWithHours } from './types';
type ScheduleDraft = {
    id?: string;
    name: string;
    timezone: string;
    hours: ScheduleHourRecord[];
};
type ScheduleSheetProps = {
    open: boolean;
    /** null = creating a new schedule; a record = editing it. */
    editing: ScheduleWithHours | null;
    saving: boolean;
    timezone: string;
    onClose: () => void;
    onSubmit: (draft: ScheduleDraft) => Promise<boolean>;
};
export declare function ScheduleSheet({ open, ...rest }: Readonly<ScheduleSheetProps>): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=schedule-sheet.d.ts.map