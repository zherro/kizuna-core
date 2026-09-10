export type { TaxonomyGroup as ServiceGroup, TaxonomyCategory as ServiceCategory, TaxonomySubcategory as ServiceSubcategory, } from '../taxonomy/taxonomy-types';
/** `stripHtml` lives in the core text helper — re-exported here for the step components. */
export { stripHtml } from '../../../lib/helper/text.helper';
export type ServiceRecord = {
    id: string;
    uid: string;
    title: string;
    categoryGroupId: string | null;
    categoryGroup?: {
        id: string;
        name: string;
        slug?: string;
        active?: boolean;
        icon?: string;
    } | null;
    categoryId: string;
    category?: {
        id: string;
        name: string;
        slug?: string;
        icon?: string;
    } | null;
    description: string;
    startingPrice: number;
    priceUnit: string;
    urgentAvailable: boolean;
    extras: Record<string, unknown>;
    status: string;
    sponsored: boolean;
    serviceLocation: string | null;
    active: boolean;
    createdBy?: string | null;
    createdAt?: string;
    updatedAt?: string;
};
export type ServiceSubcategoryLink = {
    id: string;
    serviceId: string;
    categoryGroupId: string | null;
    categoryId: string;
    categorySubId: string;
    active: boolean;
};
/**
 * The mutable state the services wizard carries across steps. Kept flat — every step reads and
 * `patch`es a subset. `groupId`/`categoryId`/`subcategoryIds` stay local until the `category`
 * step persists (they become `services` columns + `service_categories_sub` rows there).
 */
export type ServiceWizardState = {
    title: string;
    groupId: string;
    categoryId: string;
    subcategoryIds: string[];
    description: string;
    serviceLocation: string;
    startingPrice: number;
    priceUnit: string;
    imageIds: string[];
    decision: string;
    rejectionReason: string;
    decisionNote: string;
    /** Transient: validity reported by the dynamic per-category form step. Not a `services` column
     * (the resource `mapInput` ignores unknown keys), only drives that step's `canContinue`. */
    dynamicFormValid: boolean;
};
export declare const SERVICE_WIZARD_INITIAL_STATE: ServiceWizardState;
/** Enum display labels moved to `./service-labels`; re-exported for back-compat. */
export { SERVICE_STATUS_LABEL, SERVICE_LOCATION_LABEL, PRICE_UNIT_LABEL, } from './service-labels';
/** Curated subset of `price_unit` shown in the service wizard — the SAME list for every group and
 * category. O enum no banco continua com o conjunto completo; aqui ficam só as opções do nicho de
 * eventos, com rótulo/《ajuda》na linguagem do nicho. */
export declare const SERVICE_PRICE_UNIT_OPTIONS: Array<{
    value: string;
    label: string;
    hint: string;
}>;
/** Unidade de preço pré-selecionada conforme a categoria escolhida. É só um empurrão de UX — o
 * usuário sempre pode trocar. Cai em 'quote' pra qualquer slug novo. */
export declare function defaultPriceUnitForCategory(categorySlug?: string | null): string;
/** `extras`/`ServiceRecord` helpers moved to `./service-helpers`; re-exported for back-compat. */
export { fileUrl, coverImage, formatServicePrice } from './service-helpers';
//# sourceMappingURL=service-type.d.ts.map