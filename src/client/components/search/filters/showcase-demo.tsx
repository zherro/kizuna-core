'use client';

import { useMemo, useState } from 'react';
import { FilterCategoryList } from './filter-category-list';
import { FilterCityChips } from './filter-city-chips';
import type { CityOption } from './filter-cities';
import { FilterGroupLink } from './filter-group-link';
import { FilterGroupList } from './filter-group-list';
import { FilterSubcategoryChips } from './filter-subcategory-chips';
import { Collapse, useRetained } from './filter-motion';
import { FilterSection } from './filter-parts';
import {
  buildFilterTaxonomy,
  categoriesOfGroup,
  groupChangePatch,
  subcategoryBlocks,
  toggleCategory,
  toggleSubcategory,
  type CategoryRow,
  type GroupRow,
  type StatRow,
} from './filter-taxonomy';

/**
 * Showcase dos blocos do filtro da busca, com taxonomia e cidades de exemplo (sem rede): o painel
 * real (`SearchFiltersPanel`) busca os dados em `/api/resources/*`; aqui os mesmos blocos recebem
 * dados prontos por props, e a orquestração é um espelho enxuto do painel.
 */

const GROUPS: GroupRow[] = [
  { id: 1, name: 'Eventos', slug: 'eventos', icon: 'PartyPopper', sortOrder: 1 },
  { id: 2, name: 'Serviços', slug: 'servicos', icon: 'Wrench', sortOrder: 2 },
];

const CATEGORIES: CategoryRow[] = [
  { id: 10, name: 'Shows', icon: 'Music', categoryGroupId: 1, extraGroupIds: [] },
  { id: 11, name: 'Teatro', icon: 'Drama', categoryGroupId: 1, extraGroupIds: [] },
  { id: 12, name: 'Festas', icon: 'Cake', categoryGroupId: 1, extraGroupIds: [] },
  { id: 20, name: 'Eletricista', icon: 'Zap', categoryGroupId: 2, extraGroupIds: [1] },
  { id: 21, name: 'Encanador', icon: 'Droplets', categoryGroupId: 2, extraGroupIds: [] },
];

const sub = (categoryId: number, id: number, name: string, categoryName: string): StatRow => ({
  id,
  categoryId,
  categoryName,
  categoryGroupId: null,
  subcategoryId: id,
  subcategoryName: name,
});

const STATS: StatRow[] = [
  sub(10, 101, 'Sertanejo', 'Shows'),
  sub(10, 102, 'Rock', 'Shows'),
  sub(10, 103, 'Pagode', 'Shows'),
  sub(11, 111, 'Comédia', 'Teatro'),
  sub(11, 112, 'Drama', 'Teatro'),
  sub(12, 121, 'Aniversário', 'Festas'),
  sub(20, 201, 'Residencial', 'Eletricista'),
  sub(20, 202, 'Predial', 'Eletricista'),
  sub(21, 211, 'Vazamento', 'Encanador'),
];

const TAXONOMY = buildFilterTaxonomy({ groups: GROUPS, categories: CATEGORIES, stats: STATS });

const CITIES: CityOption[] = [
  ['5103403', 'Cuiabá'],
  ['5108402', 'Várzea Grande'],
  ['5107602', 'Rondonópolis'],
  ['5107909', 'Sinop'],
  ['5107925', 'Sorriso'],
  ['5101902', 'Cáceres'],
].map(([value, label]) => ({ value, label, stateCode: 'MT', stateName: 'Mato Grosso' }));

const DEFAULT_CITIES = ['5103403', '5108402'];

export function SearchFilterBlocksDemo() {
  const [groupSlug, setGroupSlug] = useState<string | null>('eventos');
  const [picking, setPicking] = useState(false);
  const [categoryIds, setCategoryIds] = useState<number[]>([10]);
  const [subcategoryIds, setSubcategoryIds] = useState<number[]>([]);
  const [cityIds, setCityIds] = useState<string[]>(DEFAULT_CITIES);

  const group = TAXONOMY.groups.find((g) => g.slug === groupSlug) ?? null;
  const categories = useMemo(
    () => (group ? categoriesOfGroup(TAXONOMY, group.id) : []),
    [group]
  );
  const blocks = subcategoryBlocks(TAXONOMY, categoryIds, subcategoryIds);
  const shownBlocks = useRetained(blocks);

  function chooseGroup(slug: string | null) {
    const patch = groupChangePatch(slug);
    setGroupSlug(patch.groupSlug ?? null);
    setCategoryIds(patch.categoryIds ?? []);
    setSubcategoryIds(patch.subcategoryIds ?? []);
    setPicking(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-xs flex-col gap-5 rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-4">
      {picking || !group ? (
        <FilterGroupList
          groups={TAXONOMY.groups}
          activeSlug={groupSlug}
          onSelect={chooseGroup}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <FilterGroupLink name={group.name} icon={group.icon} onClick={() => setPicking(true)} />
          <FilterCategoryList
            categories={categories}
            selectedIds={categoryIds}
            groupLabel={group.name}
            onClear={() => {
              setCategoryIds([]);
              setSubcategoryIds([]);
            }}
            onToggle={(id) => {
              const next = toggleCategory(TAXONOMY, { categoryIds, subcategoryIds }, id);
              setCategoryIds(next.categoryIds);
              setSubcategoryIds(next.subcategoryIds);
            }}
          />
        </div>
      )}

      <Collapse open={blocks.length > 0 && !picking && group !== null}>
        <FilterSection title="Especialidades">
          <FilterSubcategoryChips
            blocks={shownBlocks}
            selectedIds={subcategoryIds}
            showCategoryLabel={categoryIds.length > 1}
            onToggle={(id) => setSubcategoryIds(toggleSubcategory(subcategoryIds, id))}
          />
        </FilterSection>
      </Collapse>

      <FilterSection title="Localização">
        <FilterCityChips
          selectedIds={cityIds}
          cities={CITIES}
          isCustom={cityIds.join(',') !== DEFAULT_CITIES.join(',')}
          stateCode="MT"
          onChange={setCityIds}
          onResetDefault={() => setCityIds(DEFAULT_CITIES)}
        />
      </FilterSection>
    </div>
  );
}
