import { type TaxonomyCategory, type TaxonomyEditTarget, type TaxonomyGroup, type TaxonomyItem, type TaxonomyLevel, type TaxonomySubcategory } from './taxonomy-types';
type TaxonomyEditPanelProps = {
    target: TaxonomyEditTarget | null;
    groups: TaxonomyGroup[];
    categories: TaxonomyCategory[];
    subcategories: TaxonomySubcategory[];
    onClose: () => void;
    onSaved: (level: TaxonomyLevel, item: TaxonomyItem) => void;
};
export declare function TaxonomyEditPanel({ target, groups, categories, subcategories, onClose, onSaved, }: Readonly<TaxonomyEditPanelProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=taxonomy-edit-panel.d.ts.map