'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { TaxonomyIcon } from '../../taxonomy/taxonomy-icon';
import { cn } from '../../../../lib/utils';
/**
 * Modal do passo 2: escolhida a área (grupo), aqui o usuário escolhe a categoria numa lista com
 * scroll. Selecionar fecha o modal — as especialidades ficam na tela do passo, não aqui. Abre
 * automático quando já há grupo sem categoria; reabre pelo botão "Editar" do resumo.
 */
export function CategoryPickerModal({ open, onOpenChange, group, categories, categoriesLoading, categoryId, onSelectCategory, }) {
    useEffect(() => {
        if (!open)
            return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event) => {
            if (event.key === 'Escape')
                onOpenChange(false);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener('keydown', onKey);
        };
    }, [open, onOpenChange]);
    if (!open)
        return null;
    const filtered = categories
        .filter((category) => String(category.categoryGroupId) === String(group?.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return (_jsx("div", { className: "fixed inset-0 z-[60] grid place-items-center bg-background p-4", onMouseDown: (event) => {
            if (event.target === event.currentTarget)
                onOpenChange(false);
        }, children: _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": `Categoria em ${group?.name ?? ''}`, className: "flex h-[min(36rem,90dvh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl", children: [_jsxs("header", { className: "flex items-center gap-3 border-b border-border px-3 py-2.5", children: [_jsxs("button", { type: "button", onClick: () => onOpenChange(false), className: "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted", children: [_jsx(ChevronLeft, { className: "h-4 w-4" }), "Voltar"] }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "truncate text-sm font-semibold text-foreground", children: "Qual a sua categoria?" }), _jsx("p", { className: "truncate text-xs text-muted-foreground", children: group?.name })] })] }), _jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-2", children: categoriesLoading && filtered.length === 0 ? (_jsx("p", { className: "px-3 py-4 text-sm text-muted-foreground", children: "Carregando categorias\u2026" })) : filtered.length === 0 ? (_jsx("p", { className: "px-3 py-4 text-sm text-muted-foreground", children: "Nenhuma categoria ativa nesta \u00E1rea." })) : (_jsx("ul", { className: "space-y-0.5", children: filtered.map((category) => {
                            const active = String(category.id) === String(categoryId);
                            return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => {
                                        onSelectCategory(String(category.id));
                                        onOpenChange(false);
                                    }, className: cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors', active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'), children: [_jsx(TaxonomyIcon, { icon: category.icon, className: "h-4 w-4 shrink-0" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-sm font-medium", children: category.name }), category.description ? (_jsx("span", { className: "block truncate text-xs text-muted-foreground", children: category.description })) : null] }), active ? _jsx(Check, { className: "h-4 w-4 shrink-0" }) : null] }) }, category.id));
                        }) })) })] }) }));
}
//# sourceMappingURL=category-picker-modal.js.map