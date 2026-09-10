import type { ServiceCategory, ServiceGroup } from '../service-type';
/**
 * Modal do passo 2: escolhida a área (grupo), aqui o usuário escolhe a categoria numa lista com
 * scroll. Selecionar fecha o modal — as especialidades ficam na tela do passo, não aqui. Abre
 * automático quando já há grupo sem categoria; reabre pelo botão "Editar" do resumo.
 */
export declare function CategoryPickerModal({ open, onOpenChange, group, categories, categoriesLoading, categoryId, onSelectCategory, }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    group: ServiceGroup | undefined;
    categories: ServiceCategory[];
    categoriesLoading: boolean;
    categoryId: string;
    onSelectCategory: (id: string) => void;
}): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=category-picker-modal.d.ts.map