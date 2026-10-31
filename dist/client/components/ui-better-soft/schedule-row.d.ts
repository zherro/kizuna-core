import type { LucideIcon } from 'lucide-react';
type ScheduleRowProps = {
    label: string;
    icon?: LucideIcon;
    description?: string;
    enabled: boolean;
    onEnabledChange: (value: boolean) => void;
    start: string;
    end: string;
    onStartChange: (value: string) => void;
    onEndChange: (value: string) => void;
    switchAriaLabel?: string;
};
export declare function ScheduleRow({ label, icon: Icon, description, enabled, onEnabledChange, start, end, onStartChange, onEndChange, switchAriaLabel, }: Readonly<ScheduleRowProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=schedule-row.d.ts.map