import type { ServiceCreatableConfig } from './wizard-config';

type GroupLike = { id: string | number; slug: string };
type CategoryLike = {
  id: string | number;
  slug: string;
  categoryGroupId: string | number | null;
  extraGroupIds?: (string | number)[];
};

type Input<G extends GroupLike, C extends CategoryLike> = {
  groups: G[];
  categories: C[];
  creatable?: ServiceCreatableConfig;
  /** Root (ou quem o projeto decidir) vê tudo. */
  bypass?: boolean;
  /** Em edição: grupo/categoria já gravados no anúncio continuam visíveis. */
  keep?: { groupId?: string | number | null; categoryId?: string | number | null };
};

const same = (a: unknown, b: unknown) => a != null && b != null && String(a) === String(b);

/**
 * Restringe, no wizard, em que grupos/categorias o usuário pode CRIAR (`wizards.servicos.creatable`
 * no `kizuna.config.json`). Só a criação: busca, listagem e detalhe não passam por aqui.
 * `creatable.groups` libera o grupo inteiro; `creatable.categories` libera só aquela categoria
 * (e o grupo dela aparece só com ela). Sem `creatable`, ou com `bypass`, devolve tudo.
 */
export function filterCreatable<G extends GroupLike, C extends CategoryLike>({
  groups,
  categories,
  creatable,
  bypass,
  keep,
}: Input<G, C>): { groups: G[]; categories: C[] } {
  if (!creatable || bypass) return { groups, categories };

  const groupSlugs = new Set(creatable.groups ?? []);
  const categorySlugs = new Set(creatable.categories ?? []);
  const groupById = new Map(groups.map((g) => [String(g.id), g]));
  // Só o grupo PRINCIPAL conta: grupos extras (`extraGroupIds`) servem a busca/filtros, mas não
  // abrem a criação (senão uma categoria de "dicas" ligada a "turismo" arrastaria o grupo todo).
  const primaryGroup = (c: C) =>
    c.categoryGroupId == null ? undefined : groupById.get(String(c.categoryGroupId));

  const allowedCategories = categories.filter((c) => {
    const g = primaryGroup(c);
    return (
      categorySlugs.has(c.slug) ||
      (g !== undefined && groupSlugs.has(g.slug)) ||
      same(c.id, keep?.categoryId)
    );
  });

  const groupsWithCategory = new Set<string>();
  for (const c of allowedCategories) {
    const g = primaryGroup(c);
    if (g) groupsWithCategory.add(String(g.id));
  }

  const allowedGroups = groups.filter(
    (g) =>
      groupSlugs.has(g.slug) || groupsWithCategory.has(String(g.id)) || same(g.id, keep?.groupId)
  );

  return { groups: allowedGroups, categories: allowedCategories };
}

/** Slugs da config que não existem na taxonomia carregada (typo na config). */
export function unknownCreatableSlugs({
  groups,
  categories,
  creatable,
}: Pick<Input<GroupLike, CategoryLike>, 'groups' | 'categories' | 'creatable'>) {
  const groupSlugs = new Set(groups.map((g) => g.slug));
  const categorySlugs = new Set(categories.map((c) => c.slug));
  return {
    groups: (creatable?.groups ?? []).filter((s) => !groupSlugs.has(s)),
    categories: (creatable?.categories ?? []).filter((s) => !categorySlugs.has(s)),
  };
}
