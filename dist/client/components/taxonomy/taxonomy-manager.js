'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@kizuna/core/client/components/ui/button';
import { Input } from '@kizuna/core/client/components/ui/input';
import { Badge } from '@kizuna/core/client/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kizuna/core/client/components/ui/tabs';
import { useTenantResource } from '@kizuna/core/client/hooks/use-tenant-resource';
import { useToast } from '@kizuna/core/client/hooks/use-toast';
import { TaxonomyEditPanel } from './taxonomy-edit-panel';
import { TaxonomyGroupManager } from './taxonomy-group-manager';
import { TaxonomyIcon } from './taxonomy-icon';
function upsert(list, item) {
    const index = list.findIndex((existing) => String(existing.id) === String(item.id));
    if (index === -1)
        return [...list, item];
    const next = [...list];
    next[index] = item;
    return next;
}
function matches(normalizedTerm, ...values) {
    if (!normalizedTerm)
        return true;
    return values.some((value) => (value ?? '').toLowerCase().includes(normalizedTerm));
}
export function TaxonomyManager() {
    const { error: toastError } = useToast();
    // maxPageSize on each resource config (screen-engine/resources/taxonomy.ts `resourceTaxonomy`,
    // spread into the consuming app's postgrestResources) lifts the default 100-row cap, so a single
    // page-1 load already brings in the full tree.
    const groupsRes = useTenantResource({
        resource: 'categories_group',
        defaultItems: [],
        pageSize: 100,
        loadErrorMessage: 'Nao foi possivel carregar os grupos.',
    });
    const categoriesRes = useTenantResource({
        resource: 'categories',
        defaultItems: [],
        pageSize: 500,
        loadErrorMessage: 'Nao foi possivel carregar as categorias.',
    });
    const subcategoriesRes = useTenantResource({
        resource: 'subcategories',
        defaultItems: [],
        pageSize: 500,
        loadErrorMessage: 'Nao foi possivel carregar as especialidades.',
    });
    const tagsRes = useTenantResource({
        resource: 'categories_sub_tags',
        defaultItems: [],
        pageSize: 1000,
        loadErrorMessage: 'Nao foi possivel carregar as tags.',
    });
    const [search, setSearch] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState(new Set());
    const [editTarget, setEditTarget] = useState(null);
    const [reorderingGroupId, setReorderingGroupId] = useState(null);
    const { setItems: setGroups, saveOne: saveGroup } = groupsRes;
    const { setItems: setCategories } = categoriesRes;
    const { setItems: setSubcategories } = subcategoriesRes;
    const { setItems: setTags } = tagsRes;
    const hydrating = groupsRes.loading || categoriesRes.loading || subcategoriesRes.loading || tagsRes.loading;
    function handleSaved(level, item) {
        if (level === 'group') {
            setGroups((prev) => upsert(prev, item));
        }
        else if (level === 'category') {
            setCategories((prev) => upsert(prev, item));
        }
        else if (level === 'subcategory') {
            setSubcategories((prev) => upsert(prev, item));
        }
        else {
            setTags((prev) => upsert(prev, item));
        }
    }
    const groupsById = useMemo(() => {
        const map = new Map();
        for (const group of groupsRes.items)
            map.set(String(group.id), group);
        return map;
    }, [groupsRes.items]);
    const sortedGroups = useMemo(() => [...groupsRes.items].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR')), [groupsRes.items]);
    async function handleMoveGroup(group, direction) {
        const index = sortedGroups.findIndex((item) => String(item.id) === String(group.id));
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const target = sortedGroups[targetIndex];
        if (!target)
            return;
        setReorderingGroupId(String(group.id));
        try {
            const ok1 = await saveGroup({ ...group, sortOrder: target.sortOrder });
            const ok2 = await saveGroup({ ...target, sortOrder: group.sortOrder });
            if (!ok1 || !ok2)
                toastError('Nao foi possivel reordenar os grupos.');
        }
        finally {
            setReorderingGroupId(null);
        }
    }
    const subcategoriesByCategory = useMemo(() => {
        const map = new Map();
        for (const sub of subcategoriesRes.items) {
            const key = String(sub.categoryId);
            const list = map.get(key) ?? [];
            list.push(sub);
            map.set(key, list);
        }
        for (const list of map.values())
            list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        return map;
    }, [subcategoriesRes.items]);
    const tagsBySubcategory = useMemo(() => {
        const map = new Map();
        for (const tag of tagsRes.items) {
            const key = String(tag.categorySubId);
            const list = map.get(key) ?? [];
            list.push(tag);
            map.set(key, list);
        }
        for (const list of map.values())
            list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        return map;
    }, [tagsRes.items]);
    const sortedCategories = useMemo(() => [...categoriesRes.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [categoriesRes.items]);
    const normalizedSearch = search.trim().toLowerCase();
    function subcategoryMatches(sub) {
        if (matches(normalizedSearch, sub.name, sub.slug))
            return true;
        const tags = tagsBySubcategory.get(String(sub.id)) ?? [];
        return tags.some((tag) => matches(normalizedSearch, tag.name, tag.slug));
    }
    function categoryMatches(category) {
        if (matches(normalizedSearch, category.name, category.slug))
            return true;
        const subs = subcategoriesByCategory.get(String(category.id)) ?? [];
        return subs.some((sub) => subcategoryMatches(sub));
    }
    function visibleSubcategoriesFor(category) {
        const subs = subcategoriesByCategory.get(String(category.id)) ?? [];
        return normalizedSearch ? subs.filter((sub) => subcategoryMatches(sub)) : subs;
    }
    function visibleTagsFor(sub) {
        const tags = tagsBySubcategory.get(String(sub.id)) ?? [];
        return normalizedSearch
            ? tags.filter((tag) => matches(normalizedSearch, tag.name, tag.slug))
            : tags;
    }
    const visibleCategories = normalizedSearch
        ? sortedCategories.filter((category) => categoryMatches(category))
        : sortedCategories;
    function isCategoryExpanded(id) {
        return normalizedSearch ? true : expandedCategories.has(id);
    }
    function isSubcategoryExpanded(id) {
        return normalizedSearch ? true : expandedSubcategories.has(id);
    }
    function toggleCategory(id) {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }
    function toggleSubcategory(id) {
        setExpandedSubcategories((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Tabs, { defaultValue: "categorias", children: [_jsxs(TabsList, { children: [_jsx(TabsTrigger, { value: "categorias", children: "Categorias" }), _jsxs(TabsTrigger, { value: "grupos", children: ["Grupos (", groupsRes.items.length, ")"] })] }), _jsxs(TabsContent, { value: "categorias", className: "space-y-4", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsxs("div", { className: "relative w-full max-w-sm", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: search, onChange: (event) => setSearch(event.target.value), placeholder: "Buscar por nome ou slug em qualquer nivel...", className: "pl-9" })] }), _jsxs(Badge, { variant: "outline", children: [categoriesRes.items.length, " categorias"] }), _jsxs(Badge, { variant: "outline", children: [subcategoriesRes.items.length, " especialidades"] }), _jsxs(Badge, { variant: "outline", children: [tagsRes.items.length, " tags"] })] }), _jsxs(Button, { onClick: () => setEditTarget({ level: 'category', item: null }), children: [_jsx(Plus, { className: "h-4 w-4" }), "Nova categoria"] })] }), hydrating ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "Carregando a taxonomia completa..." })) : visibleCategories.length === 0 ? (_jsxs("div", { className: "rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center", children: [_jsx(FolderTree, { className: "mx-auto h-8 w-8 text-muted-foreground", "aria-hidden": "true" }), _jsx("p", { className: "mt-3 text-sm text-muted-foreground", children: "Nenhum resultado encontrado." })] })) : (_jsx("div", { className: "space-y-3", children: visibleCategories.map((category) => {
                                    const catId = String(category.id);
                                    const expanded = isCategoryExpanded(catId);
                                    const subs = visibleSubcategoriesFor(category);
                                    const group = category.categoryGroupId != null
                                        ? groupsById.get(String(category.categoryGroupId))
                                        : undefined;
                                    return (_jsxs("div", { className: "rounded-xl border border-border bg-background", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-3", children: [_jsxs("button", { type: "button", onClick: () => toggleCategory(catId), className: "flex flex-1 items-center gap-2 text-left", children: [expanded ? (_jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-muted-foreground" })) : (_jsx(ChevronRight, { className: "h-4 w-4 shrink-0 text-muted-foreground" })), _jsx("div", { className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30", children: _jsx(TaxonomyIcon, { icon: category.icon, className: "h-4 w-4 text-foreground" }) }), _jsxs("div", { children: [_jsxs("p", { className: "font-semibold text-foreground", children: [category.name, !category.active ? (_jsx(Badge, { variant: "secondary", className: "ml-2 align-middle", children: "Inativa" })) : null] }), _jsxs("p", { className: "text-xs uppercase tracking-[0.14em] text-muted-foreground", children: [category.slug, " \u00B7 ", subs.length, " especialidade(s)", group ? ` · Grupo: ${group.name}` : ' · Sem grupo'] })] })] }), _jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setEditTarget({
                                                            level: 'subcategory',
                                                            item: null,
                                                            defaultCategoryId: category.id,
                                                        }), children: [_jsx(Plus, { className: "mr-1 h-3.5 w-3.5" }), "Especialidade"] }), _jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setEditTarget({ level: 'category', item: category }), children: [_jsx(Pencil, { className: "mr-1 h-3.5 w-3.5" }), "Editar"] })] }), expanded ? (_jsx("div", { className: "space-y-2 border-t border-border px-4 py-3 pl-8", children: subs.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhuma especialidade cadastrada nesta categoria." })) : (subs.map((sub) => {
                                                    const subId = String(sub.id);
                                                    const subExpanded = isSubcategoryExpanded(subId);
                                                    const tags = visibleTagsFor(sub);
                                                    return (_jsxs("div", { className: "rounded-lg border border-border/70 bg-muted/10", children: [_jsxs("div", { className: "flex items-center gap-2 px-3 py-2", children: [_jsxs("button", { type: "button", onClick: () => toggleSubcategory(subId), className: "flex flex-1 items-center gap-2 text-left", children: [subExpanded ? (_jsx(ChevronDown, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" })) : (_jsx(ChevronRight, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" })), _jsxs("div", { children: [_jsxs("p", { className: "text-sm font-medium text-foreground", children: [sub.name, !sub.active ? (_jsx(Badge, { variant: "secondary", className: "ml-2 align-middle", children: "Inativa" })) : null] }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [sub.slug, " \u00B7 ", tags.length, " tag(s)"] })] })] }), _jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setEditTarget({
                                                                            level: 'tag',
                                                                            item: null,
                                                                            defaultCategoryId: category.id,
                                                                            defaultCategorySubId: sub.id,
                                                                        }), children: [_jsx(Plus, { className: "mr-1 h-3.5 w-3.5" }), "Tag"] }), _jsxs(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setEditTarget({ level: 'subcategory', item: sub }), children: [_jsx(Pencil, { className: "mr-1 h-3.5 w-3.5" }), "Editar"] })] }), subExpanded ? (_jsx("div", { className: "flex flex-wrap gap-2 border-t border-border/70 px-3 py-2 pl-9", children: tags.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Nenhuma tag cadastrada nesta especialidade." })) : (tags.map((tag) => (_jsxs("button", { type: "button", onClick: () => setEditTarget({ level: 'tag', item: tag }), title: tag.slug, className: `group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${tag.active
                                                                        ? 'border-border bg-background text-foreground hover:border-primary/50'
                                                                        : 'border-border/60 bg-muted/40 text-muted-foreground'}`, children: [tag.name, _jsx(Pencil, { className: "h-3 w-3 opacity-0 transition group-hover:opacity-100" })] }, String(tag.id))))) })) : null] }, subId));
                                                })) })) : null] }, catId));
                                }) }))] }), _jsx(TabsContent, { value: "grupos", children: _jsx(TaxonomyGroupManager, { groups: groupsRes.items, categories: categoriesRes.items, loading: groupsRes.loading, reorderingId: reorderingGroupId, onNew: () => setEditTarget({
                                level: 'group',
                                item: null,
                                defaultSortOrder: sortedGroups.length
                                    ? Math.max(...sortedGroups.map((group) => group.sortOrder)) + 1
                                    : 1,
                            }), onEdit: (group) => setEditTarget({ level: 'group', item: group }), onMove: handleMoveGroup }) })] }), _jsx(TaxonomyEditPanel, { target: editTarget, groups: groupsRes.items, categories: categoriesRes.items, subcategories: subcategoriesRes.items, onClose: () => setEditTarget(null), onSaved: handleSaved })] }));
}
//# sourceMappingURL=taxonomy-manager.js.map