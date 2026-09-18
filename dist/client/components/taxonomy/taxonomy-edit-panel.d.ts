import { type TaxonomyCategory, type TaxonomyEditTarget, type TaxonomyGroup, type TaxonomyGroupLink, type TaxonomyItem, type TaxonomyLevel, type TaxonomySubcategory } from './taxonomy-types';
type TaxonomyEditPanelProps = {
    target: TaxonomyEditTarget | null;
    groups: TaxonomyGroup[];
    categories: TaxonomyCategory[];
    subcategories: TaxonomySubcategory[];
    /** Secondary group memberships (plugins/taxonomy/0003_taxonomy_group_link.sql) — a category can
     * ALSO show up under these groups' vitrines, on top of its primary `categoryGroupId`. */
    groupLinks: TaxonomyGroupLink[];
    onLinkCreate: (categoryId: string | number, categoryGroupId: string | number) => Promise<boolean>;
    onLinkDelete: (linkId: string | number) => Promise<boolean>;
    onClose: () => void;
    onSaved: (level: TaxonomyLevel, item: TaxonomyItem) => void;
};
export declare function TaxonomyEditPanel({ target, groups, categories, subcategories, groupLinks, onLinkCreate, onLinkDelete, onClose, onSaved, }: Readonly<TaxonomyEditPanelProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=taxonomy-edit-panel.d.ts.map