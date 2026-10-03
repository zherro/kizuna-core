// EXEMPLO — carrosséis "por categoria" da home (Server Component). Um por item de
// `home.categoryRails` no kizuna.config.json, na ordem do array — por categoria (`slug`) ou por
// grupo de categoria (`group`). Mesma RPC da busca (só anúncios ativos e não expirados). A ordem
// é embaralhada a cada visita no navegador (ShuffledServiceCarouselSection), já que a home é ISR.
// Reusa o carrossel do detalhe do
// anúncio (ServiceCarouselSection), então os cards já vêm com o estilo da categoria
// (`serviceDetail`: cinema sem preço, cor de acento...). Categoria inexistente/sem anúncio some.
import { loadCategoryRail } from '@kizuna/core/server';
import {
  ShuffledServiceCarouselSection,
  resolveCategoryHue,
  type ServiceDetailConfig,
} from '@kizuna/core/client/components/services/detail';

export type CategoryRailConfig = {
  /** slug da categoria (`categories.slug`) — use este OU `group` */
  slug?: string;
  /** slug do grupo de categoria (`categories_group.slug`) — use este OU `slug` */
  group?: string;
  /** título da trilha; sem ele usa o nome da categoria */
  title?: string;
  /** máximo de cards (default 10); se vierem todos, a trilha termina com o card "Ver mais" */
  limit?: number;
};

export async function CategoryRails({
  rails,
  detailConfig,
}: {
  rails: CategoryRailConfig[];
  detailConfig?: ServiceDetailConfig | null;
}) {
  const loaded = await Promise.all(rails.map((rail) =>
      loadCategoryRail(rail.group ? { group: rail.group } : { slug: rail.slug ?? '' }, rail)
    ));

  return (
    <>
      {loaded.map((data, index) => {
        if (!data) return null;
        const { kind, category, items, limit, hasMore } = data;
        const searchFilter =
          kind === 'group' ? `group=${category.slug}` : `categoryId=${category.id}`;
        return (
          <ShuffledServiceCarouselSection
            key={`${kind}:${category.slug}`}
            title={rails[index].title ?? category.name}
            services={items}
            limit={limit}
            hue={resolveCategoryHue(category, detailConfig)}
            detailConfig={detailConfig}
            className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-6"
            moreHref={hasMore ? `/busca?${searchFilter}` : undefined}
          />
        );
      })}
    </>
  );
}
