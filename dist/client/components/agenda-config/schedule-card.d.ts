import type { ScheduleWithHours } from './types';
type ScheduleCardProps = {
    schedule: ScheduleWithHours;
    busy?: boolean;
    onEdit: () => void;
    onDuplicate: () => void;
    onToggleActive: (active: boolean) => void;
    onDelete: () => void;
};
export declare function ScheduleCard({ schedule, busy, onEdit, onDuplicate, onToggleActive, onDelete, }: Readonly<ScheduleCardProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=schedule-card.d.ts.map