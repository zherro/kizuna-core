import { type ThemeTone } from '../../../../lib/ui-tone';
type FilterStatCardProps = {
    label: string;
    /** `string` allowed for a loading placeholder (e.g. `'—'`) — see `services-list-block.tsx`'s
     * `StatusFilterTile`. */
    value: number | string;
    active: boolean;
    onClick: () => void;
    /** Same tone vocabulary as the rest of `/painel` — `src/lib/ui-tone.ts`. Omit for neutral. */
    tone?: ThemeTone;
};
export declare function FilterStatCard({ label, value, active, onClick, tone, }: Readonly<FilterStatCardProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=filter-stat-card.d.ts.map