'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDown, ArrowUp, FolderKanban, Pencil, Plus } from 'lucide-react';
import { Button } from '@kizuna/core/client/components/ui/button';
import { Badge } from '@kizuna/core/client/components/ui/badge';
import { TaxonomyIcon } from './taxonomy-icon';
export function TaxonomyGroupManager({ groups, categories, loading, reorderingId, onNew, onEdit, onMove, }) {
    const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR'));
    function categoryCountFor(groupId) {
        return categories.filter((category) => String(category.categoryGroupId) === String(groupId))
            .length;
    }
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "max-w-2xl text-sm text-muted-foreground", children: "Grupos representam o contexto de vida do usuario e ficam acima das categorias. Use as setas para definir a ordem de exibicao." }), _jsxs(Button, { onClick: onNew, children: [_jsx(Plus, { className: "h-4 w-4" }), "Novo grupo"] })] }), loading ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando os grupos..." })) : sortedGroups.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center", children: [_jsx(FolderKanban, { className: "mx-auto h-8 w-8 text-muted-foreground", "aria-hidden": "true" }), _jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Nenhum grupo cadastrado." })] })) : (_jsx("div", { className: "space-y-2", children: sortedGroups.map((group, index) => {
                    const groupId = String(group.id);
                    const isReordering = reorderingId === groupId;
                    return (_jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", disabled: index === 0 || isReordering, onClick: () => onMove(group, 'up'), children: _jsx(ArrowUp, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "h-6 w-6", disabled: index === sortedGroups.length - 1 || isReordering, onClick: () => onMove(group, 'down'), children: _jsx(ArrowDown, { className: "h-3.5 w-3.5" }) })] }), _jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30", children: _jsx(TaxonomyIcon, { icon: group.icon, className: "h-4 w-4 text-foreground" }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "font-semibold text-foreground", children: [group.name, !group.active ? (_jsx(Badge, { variant: "secondary", className: "ml-2 align-middle", children: "Inativo" })) : null] }), _jsxs("p", { className: "text-xs uppercase tracking-[0.14em] text-muted-foreground", children: [group.slug, " \u00B7 ", categoryCountFor(group.id), " categoria(s)"] }), group.description ? (_jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: group.description })) : null, group.tags ? (_jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", children: group.tags
                                            .split(',')
                                            .map((tag) => tag.trim())
                                            .filter(Boolean)
                                            .map((tag) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: tag }, tag))) })) : null] }), _jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => onEdit(group), children: [_jsx(Pencil, { className: "mr-1 h-3.5 w-3.5" }), "Editar"] })] }, groupId));
                }) }))] }));
}
//# sourceMappingURL=taxonomy-group-manager.js.map