'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { TaxonomyIcon } from '../../taxonomy/taxonomy-icon';
import { IconChoiceGrid } from '../../ui-better-soft/lists/icon-choice-grid';
import { useWizardLayout } from '../../wizard/wizard-layout';
import { defaultPriceUnitForCategory, } from '../service-type';
import { StepHeader } from './step-header';
import { StepSubcategory } from './step-subcategory';
import { CategoryPickerModal } from './category-picker-modal';
/**
 * Passo 2 do wizard. Escolha da ÁREA (grupo) — sempre a partir do grupo, que é mais amplo.
 * Selecionar a área abre o CategoryPickerModal. As especialidades ficam nesta tela, depois da
 * categoria.
 *
 * Comportamento preservado do wizard antigo (.claude/domains/services.md §Navigation):
 *  - modal abre sozinho ao entrar no passo quando já há `groupId` e ainda não há `categoryId`;
 *  - reclicar o mesmo card (ou revisitar em edição) NÃO apaga a categoria/especialidades já
 *    carregadas — o reset de campos dependentes só acontece quando o valor realmente muda.
 */
export function StepCategory(props) {
    const { state, patch, entities, touched } = props;
    const groups = entities.groups ?? [];
    const categories = entities.categories ?? [];
    const subcategories = entities.subcategories ?? [];
    const groupsLoading = Boolean(entities.groupsLoading);
    const categoriesLoading = Boolean(entities.categoriesLoading);
    const subcategoriesLoading = Boolean(entities.subcategoriesLoading);
    const { groupId, categoryId, subcategoryIds } = state;
    const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
    const selectedGroup = groups.find((group) => String(group.id) === String(groupId));
    const selectedCategory = categories.find((category) => String(category.id) === String(categoryId));
    // Stacked (scroll) layout: don't pop the modal on mount — the step is visible in a long list and
    // an unprompted dialog is jarring. The "Abrir/Trocar" button still opens it on demand.
    const { stacked } = useWizardLayout();
    const [pickerOpen, setPickerOpen] = useState(() => Boolean(groupId) && !categoryId && !stacked);
    function handleGroupSelect(nextGroupId) {
        const changed = nextGroupId !== groupId;
        if (changed) {
            patch({ groupId: nextGroupId, categoryId: '', subcategoryIds: [] });
        }
        else {
            patch({ groupId: nextGroupId });
        }
        setPickerOpen(true);
    }
    function handleCategorySelect(nextCategoryId) {
        const changed = nextCategoryId !== categoryId;
        const next = { categoryId: nextCategoryId };
        if (changed)
            next.subcategoryIds = [];
        if (!touched.has('priceUnit')) {
            const nextCategory = categories.find((c) => String(c.id) === String(nextCategoryId));
            next.priceUnit = defaultPriceUnitForCategory(nextCategory?.slug);
        }
        patch(next);
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Em qual \u00E1rea voc\u00EA trabalha?", subtitle: "Escolha a \u00E1rea \u2014 a categoria vem na sequ\u00EAncia e as especialidades logo abaixo.", why: "Come\u00E7amos pela \u00E1rea porque ela \u00E9 mais ampla: a mesma categoria aparece em \u00E1reas diferentes, e a \u00E1rea certa p\u00F5e o seu an\u00FAncio na frente de quem procura o que voc\u00EA faz." }), groupsLoading && sortedGroups.length === 0 ? null : (_jsx(IconChoiceGrid, { items: sortedGroups.map((group) => ({
                    id: String(group.id),
                    icon: _jsx(TaxonomyIcon, { icon: group.icon, className: "h-5 w-5" }),
                    title: group.name,
                    description: group.description || undefined,
                })), value: String(groupId), onChange: handleGroupSelect, accent: "primary", emptyMessage: "Nenhuma \u00E1rea ativa encontrada." })), selectedGroup ? (_jsxs("button", { type: "button", onClick: () => setPickerOpen(true), className: "flex w-full items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted", children: [_jsxs("span", { className: "min-w-0", children: [_jsx("span", { className: "block text-xs text-muted-foreground", children: selectedGroup.name }), _jsx("span", { className: "mt-0.5 block truncate text-sm font-semibold text-foreground", children: selectedCategory?.name ?? 'Escolher categoria' })] }), _jsxs("span", { className: "inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary", children: [_jsx(Pencil, { className: "h-3.5 w-3.5" }), categoryId ? 'Trocar' : 'Abrir'] })] })) : null, selectedGroup && categoryId ? (_jsx("div", { className: "border-t border-border pt-5", children: _jsx(StepSubcategory, { subcategories: subcategories, loading: subcategoriesLoading, category: selectedCategory, value: subcategoryIds, onChange: (ids) => patch({ subcategoryIds: ids }) }) })) : null, _jsx(CategoryPickerModal, { open: pickerOpen, onOpenChange: setPickerOpen, group: selectedGroup, categories: categories, categoriesLoading: categoriesLoading, categoryId: categoryId, onSelectCategory: handleCategorySelect })] }));
}
//# sourceMappingURL=step-category.js.map