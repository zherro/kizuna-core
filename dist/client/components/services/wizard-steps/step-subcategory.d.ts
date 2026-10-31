import type { ServiceCategory, ServiceSubcategory } from '../service-type';
/**
 * Painel de especialidades ("tags") da categoria escolhida — usado dentro do passo Categoria.
 * Contador no título, chips num cartão destacado, explicação só no balão que encolhe.
 */
export declare function StepSubcategory({ subcategories, loading, category, value, onChange, }: {
    subcategories: ServiceSubcategory[];
    loading: boolean;
    category: ServiceCategory | undefined;
    value: string[];
    onChange: (subcategoryIds: string[]) => void;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=step-subcategory.d.ts.map