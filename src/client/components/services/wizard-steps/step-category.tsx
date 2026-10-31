'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { TaxonomyIcon } from '../../taxonomy/taxonomy-icon';
import { IconChoiceGrid } from '../../ui-better-soft/lists/icon-choice-grid';
import type { WizardStepProps } from '../../wizard/types';
import { useWizardLayout } from '../../wizard/wizard-layout';
import {
  defaultPriceUnitForCategory,
  type ServiceCategory,
  type ServiceGroup,
  type ServiceSubcategory,
  type ServiceWizardState,
} from '../service-type';
import { StepHeader } from './step-header';
import { StepSubcategory } from './step-subcategory';
import { CategoryPickerModal } from './category-picker-modal';

/**
 * Passo 2 do wizard. Escolha da ÁREA (grupo) — sempre a partir do grupo, que é mais amplo.
 * Selecionar a área abre o CategoryPickerModal. As especialidades ficam nesta tela, depois da
 * categoria.
 *
 * Fluxo (também vale quando é a Naví conversacional que decide grupo/categoria, não só clique):
 *  - grupo definido e categoria ainda vazia → abre o modal de categoria sozinho;
 *  - categoria definida → fecha o modal e rola até as tags de especialidade;
 *  - categoria definida mas nenhuma especialidade marcada ainda → esconde a Naví (se a categoria
 *    tem especialidades cadastradas) pra obrigar a escolha manual das tags, sem competir com o
 *    chat. Volta a aparecer assim que a 1ª tag é marcada.
 *  - reclicar o mesmo card (ou revisitar em edição) NÃO apaga a categoria/especialidades já
 *    carregadas — o reset de campos dependentes só acontece quando o valor realmente muda.
 */
export function StepCategory(props: WizardStepProps<ServiceWizardState>) {
  const { state, patch, entities, touched, setNaviSuppressed } = props;
  const groups = (entities.groups as ServiceGroup[] | undefined) ?? [];
  const categories = (entities.categories as ServiceCategory[] | undefined) ?? [];
  const subcategories = (entities.subcategories as ServiceSubcategory[] | undefined) ?? [];
  const groupsLoading = Boolean(entities.groupsLoading);
  const categoriesLoading = Boolean(entities.categoriesLoading);
  const subcategoriesLoading = Boolean(entities.subcategoriesLoading);

  const { groupId, categoryId, subcategoryIds } = state;

  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedGroup = groups.find((group) => String(group.id) === String(groupId));
  const selectedCategory = categories.find(
    (category) => String(category.id) === String(categoryId)
  );

  // Stacked (scroll) layout: don't pop the modal on mount — the step is visible in a long list and
  // an unprompted dialog is jarring. The "Abrir/Trocar" button still opens it on demand.
  const { stacked } = useWizardLayout();
  const [pickerOpen, setPickerOpen] = useState(() => Boolean(groupId) && !categoryId && !stacked);

  // Reabre o modal sempre que o GRUPO muda pra um valor definido e ainda não há categoria — vale
  // pro clique manual E pra Naví definindo o grupo pelo chat (o `useState` acima só cobre o
  // mount; sem este efeito, um grupo decidido depois de montado não abria nada no layout stacked).
  const prevGroupIdRef = useRef(groupId);
  useEffect(() => {
    const prevGroupId = prevGroupIdRef.current;
    prevGroupIdRef.current = groupId;
    if (groupId && groupId !== prevGroupId && !categoryId) setPickerOpen(true);
  }, [groupId, categoryId]);

  // Categoria definida → fecha o modal e rola até as tags de especialidade.
  const subcategorySectionRef = useRef<HTMLDivElement | null>(null);
  const prevCategoryIdRef = useRef(categoryId);
  useEffect(() => {
    const prevCategoryId = prevCategoryIdRef.current;
    prevCategoryIdRef.current = categoryId;
    if (categoryId && categoryId !== prevCategoryId) {
      setPickerOpen(false);
      subcategorySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [categoryId]);

  // Categoria escolhida, especialidades cadastradas pra ela, mas nenhuma marcada ainda → esconde
  // a Naví enquanto isso, pra obrigar a seleção manual das tags (ela volta assim que a 1ª for
  // marcada, ou quando o passo muda — ver o reset em `wizard.tsx`).
  useEffect(() => {
    if (!setNaviSuppressed) return;
    const hasSubcategories = subcategories.some((s) => String(s.categoryId) === String(categoryId));
    setNaviSuppressed(Boolean(categoryId) && hasSubcategories && subcategoryIds.length === 0);
  }, [categoryId, subcategoryIds.length, subcategories, setNaviSuppressed]);

  function handleGroupSelect(nextGroupId: string) {
    const changed = nextGroupId !== groupId;
    if (changed) {
      patch({ groupId: nextGroupId, categoryId: '', subcategoryIds: [] });
    } else {
      patch({ groupId: nextGroupId });
    }
    setPickerOpen(true);
  }

  function handleCategorySelect(nextCategoryId: string) {
    const changed = nextCategoryId !== categoryId;
    const next: Partial<ServiceWizardState> = { categoryId: nextCategoryId };
    if (changed) next.subcategoryIds = [];
    if (!touched.has('priceUnit')) {
      const nextCategory = categories.find((c) => String(c.id) === String(nextCategoryId));
      next.priceUnit = defaultPriceUnitForCategory(nextCategory?.slug);
    }
    patch(next);
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title="Em qual área você trabalha?"
        subtitle="Escolha a área — a categoria vem na sequência e as especialidades logo abaixo."
        why="Começamos pela área porque ela é mais ampla: a mesma categoria aparece em áreas diferentes, e a área certa põe o seu anúncio na frente de quem procura o que você faz."
      />

      {groupsLoading && sortedGroups.length === 0 ? null : (
        <IconChoiceGrid
          items={sortedGroups.map((group) => ({
            id: String(group.id),
            icon: <TaxonomyIcon icon={group.icon} className="h-5 w-5" />,
            title: group.name,
            description: group.description || undefined,
          }))}
          value={String(groupId)}
          onChange={handleGroupSelect}
          accent="primary"
          emptyMessage="Nenhuma área ativa encontrada."
        />
      )}

      {selectedGroup ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{selectedGroup.name}</span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
              {selectedCategory?.name ?? 'Escolher categoria'}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
            <Pencil className="h-3.5 w-3.5" />
            {categoryId ? 'Trocar' : 'Abrir'}
          </span>
        </button>
      ) : null}

      {selectedGroup && categoryId ? (
        <div ref={subcategorySectionRef} className="scroll-mt-20 border-t border-border pt-5">
          <StepSubcategory
            subcategories={subcategories}
            loading={subcategoriesLoading}
            category={selectedCategory}
            value={subcategoryIds}
            onChange={(ids) => patch({ subcategoryIds: ids })}
          />
        </div>
      ) : null}

      <CategoryPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        group={selectedGroup}
        categories={categories}
        categoriesLoading={categoriesLoading}
        categoryId={categoryId}
        onSelectCategory={handleCategorySelect}
      />
    </div>
  );
}
