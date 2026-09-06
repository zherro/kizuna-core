import { type ScheduleHourRecord, type ScheduleWithHours } from './types';
type ScheduleSheetProps = {
    open: boolean;
    /** null = creating a new schedule; a record = editing it. */
    editing: ScheduleWithHours | null;
    saving: boolean;
    timezone: string;
    onClose: () => void;
    onSubmit: (draft: {
        id?: string;
        name: string;
        timezone: string;
        hours: ScheduleHourRecord[];
    }) => Promise<boolean>;
};
export declare function ScheduleSheet({ open, editing, saving, timezone, onClose, onSubmit, }: Readonly<ScheduleSheetProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=schedule-sheet.d.ts.map