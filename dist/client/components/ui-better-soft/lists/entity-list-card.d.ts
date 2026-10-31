import type { ReactNode } from 'react';
import { type ThemeTone } from '../../../../lib/ui-tone';
type EntityListCardProps = {
    leading: ReactNode;
    trailing?: ReactNode;
    /** Optional left accent strip, same tone vocabulary as `services-list-block.tsx`/
     * `responsive-resource-table.tsx` (`src/lib/ui-tone.ts`). Omit for the plain neutral border. */
    tone?: ThemeTone;
};
export declare function EntityListCard({ leading, trailing, tone }: Readonly<EntityListCardProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=entity-list-card.d.ts.map