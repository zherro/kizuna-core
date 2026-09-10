import type { TaxonomyCategory, TaxonomyGroup } from './taxonomy-types';
type TaxonomyGroupManagerProps = {
    groups: TaxonomyGroup[];
    categories: TaxonomyCategory[];
    loading: boolean;
    reorderingId: string | null;
    onNew: () => void;
    onEdit: (group: TaxonomyGroup) => void;
    onMove: (group: TaxonomyGroup, direction: 'up' | 'down') => void;
};
export declare function TaxonomyGroupManager({ groups, categories, loading, reorderingId, onNew, onEdit, onMove, }: Readonly<TaxonomyGroupManagerProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=taxonomy-group-manager.d.ts.map