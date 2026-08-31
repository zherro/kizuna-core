'use client';

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
import type {
  TaxonomyCategory,
  TaxonomyEditTarget,
  TaxonomyGroup,
  TaxonomyItem,
  TaxonomyLevel,
  TaxonomySubcategory,
  TaxonomyTag,
} from './taxonomy-types';

function upsert<T extends { id: string | number }>(list: T[], item: T): T[] {
  const index = list.findIndex((existing) => String(existing.id) === String(item.id));
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

function matches(normalizedTerm: string, ...values: Array<string | undefined>) {
  if (!normalizedTerm) return true;
  return values.some((value) => (value ?? '').toLowerCase().includes(normalizedTerm));
}

export function TaxonomyManager() {
  const { error: toastError } = useToast();

  // maxPageSize on each resource config (see src/lib/server/resources/resource-taxonomy.ts) lifts the
  // default 100-row cap, so a single page-1 load already brings in the full tree.
  const groupsRes = useTenantResource<TaxonomyGroup>({
    resource: 'categories_group',
    defaultItems: [],
    pageSize: 100,
    loadErrorMessage: 'Nao foi possivel carregar os grupos.',
  });
  const categoriesRes = useTenantResource<TaxonomyCategory>({
    resource: 'categories',
    defaultItems: [],
    pageSize: 500,
    loadErrorMessage: 'Nao foi possivel carregar as categorias.',
  });
  const subcategoriesRes = useTenantResource<TaxonomySubcategory>({
    resource: 'subcategories',
    defaultItems: [],
    pageSize: 500,
    loadErrorMessage: 'Nao foi possivel carregar as especialidades.',
  });
  const tagsRes = useTenantResource<TaxonomyTag>({
    resource: 'categories_sub_tags',
    defaultItems: [],
    pageSize: 1000,
    loadErrorMessage: 'Nao foi possivel carregar as tags.',
  });

  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<TaxonomyEditTarget | null>(null);
  const [reorderingGroupId, setReorderingGroupId] = useState<string | null>(null);

  const { setItems: setGroups, saveOne: saveGroup } = groupsRes;
  const { setItems: setCategories } = categoriesRes;
  const { setItems: setSubcategories } = subcategoriesRes;
  const { setItems: setTags } = tagsRes;
  const hydrating =
    groupsRes.loading || categoriesRes.loading || subcategoriesRes.loading || tagsRes.loading;

  function handleSaved(level: TaxonomyLevel, item: TaxonomyItem) {
    if (level === 'group') {
      setGroups((prev) => upsert(prev, item as TaxonomyGroup));
    } else if (level === 'category') {
      setCategories((prev) => upsert(prev, item as TaxonomyCategory));
    } else if (level === 'subcategory') {
      setSubcategories((prev) => upsert(prev, item as TaxonomySubcategory));
    } else {
      setTags((prev) => upsert(prev, item as TaxonomyTag));
    }
  }

  const groupsById = useMemo(() => {
    const map = new Map<string, TaxonomyGroup>();
    for (const group of groupsRes.items) map.set(String(group.id), group);
    return map;
  }, [groupsRes.items]);

  const sortedGroups = useMemo(
    () =>
      [...groupsRes.items].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR')
      ),
    [groupsRes.items]
  );

  async function handleMoveGroup(group: TaxonomyGroup, direction: 'up' | 'down') {
    const index = sortedGroups.findIndex((item) => String(item.id) === String(group.id));
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const target = sortedGroups[targetIndex];
    if (!target) return;

    setReorderingGroupId(String(group.id));
    try {
      const ok1 = await saveGroup({ ...group, sortOrder: target.sortOrder });
      const ok2 = await saveGroup({ ...target, sortOrder: group.sortOrder });
      if (!ok1 || !ok2) toastError('Nao foi possivel reordenar os grupos.');
    } finally {
      setReorderingGroupId(null);
    }
  }

  const subcategoriesByCategory = useMemo(() => {
    const map = new Map<string, TaxonomySubcategory[]>();
    for (const sub of subcategoriesRes.items) {
      const key = String(sub.categoryId);
      const list = map.get(key) ?? [];
      list.push(sub);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return map;
  }, [subcategoriesRes.items]);

  const tagsBySubcategory = useMemo(() => {
    const map = new Map<string, TaxonomyTag[]>();
    for (const tag of tagsRes.items) {
      const key = String(tag.categorySubId);
      const list = map.get(key) ?? [];
      list.push(tag);
      map.set(key, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return map;
  }, [tagsRes.items]);

  const sortedCategories = useMemo(
    () => [...categoriesRes.items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [categoriesRes.items]
  );

  const normalizedSearch = search.trim().toLowerCase();

  function subcategoryMatches(sub: TaxonomySubcategory) {
    if (matches(normalizedSearch, sub.name, sub.slug)) return true;
    const tags = tagsBySubcategory.get(String(sub.id)) ?? [];
    return tags.some((tag) => matches(normalizedSearch, tag.name, tag.slug));
  }

  function categoryMatches(category: TaxonomyCategory) {
    if (matches(normalizedSearch, category.name, category.slug)) return true;
    const subs = subcategoriesByCategory.get(String(category.id)) ?? [];
    return subs.some((sub) => subcategoryMatches(sub));
  }

  function visibleSubcategoriesFor(category: TaxonomyCategory) {
    const subs = subcategoriesByCategory.get(String(category.id)) ?? [];
    return normalizedSearch ? subs.filter((sub) => subcategoryMatches(sub)) : subs;
  }

  function visibleTagsFor(sub: TaxonomySubcategory) {
    const tags = tagsBySubcategory.get(String(sub.id)) ?? [];
    return normalizedSearch
      ? tags.filter((tag) => matches(normalizedSearch, tag.name, tag.slug))
      : tags;
  }

  const visibleCategories = normalizedSearch
    ? sortedCategories.filter((category) => categoryMatches(category))
    : sortedCategories;

  function isCategoryExpanded(id: string) {
    return normalizedSearch ? true : expandedCategories.has(id);
  }

  function isSubcategoryExpanded(id: string) {
    return normalizedSearch ? true : expandedSubcategories.has(id);
  }

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSubcategory(id: string) {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="grupos">Grupos ({groupsRes.items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome ou slug em qualquer nivel..."
                  className="pl-9"
                />
              </div>
              <Badge variant="outline">{categoriesRes.items.length} categorias</Badge>
              <Badge variant="outline">{subcategoriesRes.items.length} especialidades</Badge>
              <Badge variant="outline">{tagsRes.items.length} tags</Badge>
            </div>
            <Button onClick={() => setEditTarget({ level: 'category', item: null })}>
              <Plus className="h-4 w-4" />
              Nova categoria
            </Button>
          </div>

          {hydrating ? (
            <p className="text-sm text-muted-foreground">Carregando a taxonomia completa...</p>
          ) : visibleCategories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <FolderTree className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleCategories.map((category) => {
                const catId = String(category.id);
                const expanded = isCategoryExpanded(catId);
                const subs = visibleSubcategoriesFor(category);
                const group =
                  category.categoryGroupId != null
                    ? groupsById.get(String(category.categoryGroupId))
                    : undefined;

                return (
                  <div key={catId} className="rounded-xl border border-border bg-background">
                    <div className="flex items-center gap-2 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleCategory(catId)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
                          <TaxonomyIcon icon={category.icon} className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {category.name}
                            {!category.active ? (
                              <Badge variant="secondary" className="ml-2 align-middle">
                                Inativa
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                            {category.slug} · {subs.length} especialidade(s)
                            {group ? ` · Grupo: ${group.name}` : ' · Sem grupo'}
                          </p>
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditTarget({
                            level: 'subcategory',
                            item: null,
                            defaultCategoryId: category.id,
                          })
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Especialidade
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTarget({ level: 'category', item: category })}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </div>

                    {expanded ? (
                      <div className="space-y-2 border-t border-border px-4 py-3 pl-8">
                        {subs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Nenhuma especialidade cadastrada nesta categoria.
                          </p>
                        ) : (
                          subs.map((sub) => {
                            const subId = String(sub.id);
                            const subExpanded = isSubcategoryExpanded(subId);
                            const tags = visibleTagsFor(sub);

                            return (
                              <div
                                key={subId}
                                className="rounded-lg border border-border/70 bg-muted/10"
                              >
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSubcategory(subId)}
                                    className="flex flex-1 items-center gap-2 text-left"
                                  >
                                    {subExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {sub.name}
                                        {!sub.active ? (
                                          <Badge variant="secondary" className="ml-2 align-middle">
                                            Inativa
                                          </Badge>
                                        ) : null}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {sub.slug} · {tags.length} tag(s)
                                      </p>
                                    </div>
                                  </button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setEditTarget({
                                        level: 'tag',
                                        item: null,
                                        defaultCategoryId: category.id,
                                        defaultCategorySubId: sub.id,
                                      })
                                    }
                                  >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Tag
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setEditTarget({ level: 'subcategory', item: sub })
                                    }
                                  >
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    Editar
                                  </Button>
                                </div>

                                {subExpanded ? (
                                  <div className="flex flex-wrap gap-2 border-t border-border/70 px-3 py-2 pl-9">
                                    {tags.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        Nenhuma tag cadastrada nesta especialidade.
                                      </p>
                                    ) : (
                                      tags.map((tag) => (
                                        <button
                                          key={String(tag.id)}
                                          type="button"
                                          onClick={() => setEditTarget({ level: 'tag', item: tag })}
                                          title={tag.slug}
                                          className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                                            tag.active
                                              ? 'border-border bg-background text-foreground hover:border-primary/50'
                                              : 'border-border/60 bg-muted/40 text-muted-foreground'
                                          }`}
                                        >
                                          {tag.name}
                                          <Pencil className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                                        </button>
                                      ))
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grupos">
          <TaxonomyGroupManager
            groups={groupsRes.items}
            categories={categoriesRes.items}
            loading={groupsRes.loading}
            reorderingId={reorderingGroupId}
            onNew={() =>
              setEditTarget({
                level: 'group',
                item: null,
                defaultSortOrder: sortedGroups.length
                  ? Math.max(...sortedGroups.map((group) => group.sortOrder)) + 1
                  : 1,
              })
            }
            onEdit={(group) => setEditTarget({ level: 'group', item: group })}
            onMove={handleMoveGroup}
          />
        </TabsContent>
      </Tabs>

      <TaxonomyEditPanel
        target={editTarget}
        groups={groupsRes.items}
        categories={categoriesRes.items}
        subcategories={subcategoriesRes.items}
        onClose={() => setEditTarget(null)}
        onSaved={handleSaved}
      />
    </>
  );
}
