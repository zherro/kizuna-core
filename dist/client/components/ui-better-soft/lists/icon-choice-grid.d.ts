import type { ReactNode } from 'react';
export type IconChoiceItem = {
    id: string;
    icon: ReactNode;
    title: string;
    description?: string;
};
/** Which design token drives the active/hover accent — the two variants already coexisting in
 * the app before this component existed (ad-wizard used `brand`, the services wizard `primary`). */
export type IconChoiceAccent = 'brand' | 'primary';
type IconChoiceGridProps = {
    items: IconChoiceItem[];
    value?: string;
    onChange: (id: string) => void;
    accent?: IconChoiceAccent;
    disabled?: boolean;
    /** `vertical`: icon on top of title/description (default). `horizontal`: icon to the left. */
    layout?: 'vertical' | 'horizontal';
    /** Tailwind grid-cols classes for the responsive breakpoints. Defaults to a 2/3/4 column ramp. */
    columnsClassName?: string;
    emptyMessage?: string;
};
/** Grid of selectable cards (icon + title + description), e.g. for a category/group picker step. */
export declare function IconChoiceGrid({ items, value, onChange, accent, disabled, layout, columnsClassName, emptyMessage, }: Readonly<IconChoiceGridProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=icon-choice-grid.d.ts.map