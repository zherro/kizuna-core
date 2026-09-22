"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppPreferences } from "../../../providers/app-preferences-provider";
import { CategorySearchPicker } from "../../taxonomy/category-search-picker";
import { TaxonomyIcon } from "../../taxonomy/taxonomy-icon";
import { IconChoiceGrid } from "../../ui-better-soft/lists/icon-choice-grid";
import type { WizardStepProps } from "../../wizard/types";
import {
  type ServiceCategory,
  type ServiceGroup,
  type ServiceSubcategory,
  type ServiceWizardState,
} from "../service-type";
import { CategorySummary } from "./category-summary";
import { StepHeader } from "./step-header";
import { StepSubcategory } from "./step-subcategory";
import { Typography } from "../../ui/typography";

/**
 * Passo 2 do wizard. Escolha da ÁREA (grupo) — sempre a partir do grupo, que é mais amplo.
 * Selecionar a área mostra, na própria tela, as categorias dela pelo `CategorySearchPicker` do core (mesmo layout do "criar demanda", sem busca — a lista já vem filtrada pelo grupo). As especialidades ficam nesta tela, depois da
 * categoria.
 *
 * Fluxo (também vale quando é a Naví conversacional que decide grupo/categoria, não só clique):
 *  - grupo definido e categoria ainda vazia → mostra a lista de categorias;
 *  - categoria definida → fecha a lista e rola até as tags de especialidade;
 *  - categoria definida mas nenhuma especialidade marcada ainda → esconde a Naví (se a categoria
 *    tem especialidades cadastradas) pra obrigar a escolha manual das tags, sem competir com o
 *    chat. Volta a aparecer assim que a 1ª tag é marcada.
 *  - reclicar o mesmo card (ou revisitar em edição) NÃO apaga a categoria/especialidades já
 *    carregadas — o reset de campos dependentes só acontece quando o valor realmente muda.
 */
export function StepCategory(props: WizardStepProps<ServiceWizardState>) {
  const { state, patch, entities, setNaviSuppressed, advance } = props;
  const { messages } = useAppPreferences();
  const t = messages.wizard;
  const groups = (entities.groups as ServiceGroup[] | undefined) ?? [];
  const categories =
    (entities.categories as ServiceCategory[] | undefined) ?? [];
  const subcategories =
    (entities.subcategories as ServiceSubcategory[] | undefined) ?? [];
  const groupsLoading = Boolean(entities.groupsLoading);
  const categoriesLoading = Boolean(entities.categoriesLoading);
  const subcategoriesLoading = Boolean(entities.subcategoriesLoading);

  const { groupId, categoryId, subcategoryIds } = state;

  const sortedGroups = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedGroup = groups.find(
    (group) => String(group.id) === String(groupId),
  );
  const selectedCategory = categories.find(
    (category) => String(category.id) === String(categoryId),
  );

  // Lista de categorias visível enquanto há grupo sem categoria, ou quando o usuário clica em
  // "Trocar". Escolher a categoria recolhe a lista e mostra o resumo.
  const [changing, setChanging] = useState(false);
  const [backToGroups, setBackToGroups] = useState(false);
  const showPicker =
    Boolean(selectedGroup) && (!categoryId || changing) && !backToGroups;

  // Categoria escolhida COM especialidades cadastradas → etapa própria só de especialidades
  // (sem grupo nem categoria na tela); voltar reabre a lista de categorias.
  const hasSubcategories = subcategories.some(
    (s) => String(s.categoryId) === String(categoryId),
  );
  const subStage =
    Boolean(selectedGroup && categoryId) &&
    hasSubcategories &&
    !changing &&
    !backToGroups;

  const selectedTagNames = subcategories
    .filter(
      (s) =>
        String(s.categoryId) === String(categoryId) &&
        subcategoryIds.map(String).includes(String(s.id)),
    )
    .map((s) => s.name);

  const groupCategoryItems = useMemo(
    () =>
      categories
        .filter((category) => {
          const gid = String(selectedGroup?.id);
          return (
            String(category.categoryGroupId) === gid ||
            (category.extraGroupIds ?? []).some((id) => String(id) === gid)
          );
        })
        .map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
        })),
    [categories, selectedGroup],
  );

  // Categoria definida → recolhe a lista e rola até as tags de especialidade.
  const subcategorySectionRef = useRef<HTMLDivElement | null>(null);
  const prevCategoryIdRef = useRef(categoryId);
  useEffect(() => {
    const prevCategoryId = prevCategoryIdRef.current;
    prevCategoryIdRef.current = categoryId;
    if (categoryId && categoryId !== prevCategoryId) {
      setChanging(false);
    }
  }, [categoryId]);

  // Categoria escolhida, especialidades cadastradas pra ela, mas nenhuma marcada ainda → esconde
  // a Naví enquanto isso, pra obrigar a seleção manual das tags (ela volta assim que a 1ª for
  // marcada, ou quando o passo muda — ver o reset em `wizard.tsx`).
  useEffect(() => {
    if (!setNaviSuppressed) return;
    setNaviSuppressed(
      Boolean(categoryId) && hasSubcategories && subcategoryIds.length === 0,
    );
  }, [categoryId, subcategoryIds.length, hasSubcategories, setNaviSuppressed]);

  // Categoria SEM especialidades escolhida por clique → não há mais nada a preencher neste passo,
  // então segue direto pro próximo (como se a seleção de especialidades não existisse). Só na
  // escolha manual: revisitar/editar uma categoria já salva não avança sozinho.
  // Outro passo (ex.: título) pediu pra abrir direto na lista de categorias.
  useEffect(() => {
    if (state.categoryStage !== "picker") return;
    setChanging(true);
    patch({ categoryStage: "" });
  }, [state.categoryStage, patch]);

  const autoAdvanceRef = useRef(false);
  useEffect(() => {
    if (!autoAdvanceRef.current || !categoryId || subcategoriesLoading) return;
    autoAdvanceRef.current = false;
    if (!hasSubcategories) advance?.();
  }, [categoryId, hasSubcategories, subcategoriesLoading, advance]);

  function handleGroupSelect(nextGroupId: string) {
    setBackToGroups(false);
    const changed = nextGroupId !== groupId;
    if (changed) {
      patch({ groupId: nextGroupId, categoryId: "", subcategoryIds: [] });
    } else {
      patch({ groupId: nextGroupId });
    }
    setChanging(false);
  }

  function handleCategorySelect(nextCategoryId: string) {
    const changed = nextCategoryId !== categoryId;
    const next: Partial<ServiceWizardState> = { categoryId: nextCategoryId };
    if (changed) next.subcategoryIds = [];
    patch(next);
    setChanging(false);
    autoAdvanceRef.current = changed;
  }

  return (
    <div className="space-y-6">
      <StepHeader
        title={
          subStage
            ? t.subcategory.stepTitle
            : showPicker
              ? t.category.categoryTitle
              : t.category.title
        }
        subtitle={subStage ? undefined : t.category.subtitle}
        why={subStage ? undefined : t.category.why}
      />

      {selectedGroup && !backToGroups ? null : groupsLoading &&
        sortedGroups.length === 0 ? null : (
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
          emptyMessage={t.category.emptyGroups}
        />
      )}

      {showPicker ? (
        <div className="space-y-3">
          <CategorySummary
            groupName={selectedGroup?.name}
            onEditCategory={() => setBackToGroups(true)}
            editCategoryLabel={t.category.change}
            editTagsLabel={t.subcategory.editTags}
          />
          <Typography.P>{t.category.pickerTitle}</Typography.P>
          <CategorySearchPicker
            items={groupCategoryItems}
            loading={categoriesLoading}
            showSearch={false}
            onSelect={handleCategorySelect}
            labels={{
              prompt: "",
              loading: t.category.loadingCategories,
              empty: t.category.noCategories,
            }}
          />
        </div>
      ) : subStage ? (
        <div
          ref={subcategorySectionRef}
          className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300 space-y-3"
        >
          <CategorySummary
            groupName={selectedGroup?.name}
            categoryName={selectedCategory?.name}
            onEditCategory={() => setChanging(true)}
            editCategoryLabel={t.category.change}
            editTagsLabel={t.subcategory.editTags}
          />
          <StepSubcategory
            subcategories={subcategories}
            loading={subcategoriesLoading}
            category={selectedCategory}
            value={subcategoryIds}
            onChange={(ids) => patch({ subcategoryIds: ids })}
          />
        </div>
      ) : selectedGroup ? (
        <CategorySummary
          groupName={selectedGroup.name}
          categoryName={selectedCategory?.name}
          tagNames={selectedTagNames}
          onEditCategory={() => setChanging(true)}
          onEditTags={hasSubcategories ? () => setBackToGroups(false) : undefined}
          editCategoryLabel={t.category.change}
          editTagsLabel={t.subcategory.editTags}
        />
      ) : null}

      {selectedGroup && categoryId && !hasSubcategories ? (
        <div className="scroll-mt-20 border-t border-border pt-5">
          <StepSubcategory
            subcategories={subcategories}
            loading={subcategoriesLoading}
            category={selectedCategory}
            value={subcategoryIds}
            onChange={(ids) => patch({ subcategoryIds: ids })}
          />
        </div>
      ) : null}
    </div>
  );
}
