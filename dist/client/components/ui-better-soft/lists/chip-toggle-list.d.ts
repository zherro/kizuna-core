import type { IconChoiceAccent } from './icon-choice-grid';
export type ChipOption = {
    id: string;
    label: string;
};
type ChipToggleListProps = {
    options: ChipOption[];
    /** Ids of the currently selected options. */
    value: string[];
    onChange: (nextValue: string[]) => void;
    accent?: IconChoiceAccent;
};
/** Row of toggleable pill chips, e.g. for picking several tags/specialties in one step. */
export declare function ChipToggleList({ options, value, onChange, accent, }: Readonly<ChipToggleListProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=chip-toggle-list.d.ts.map