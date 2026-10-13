import { loadServicesByTags } from '../../../../server/services/tag-rail-data';
import { orderTagsForRails, normalizeServiceTags, serviceTagRailTitle } from '../../../../shared/service-tags';
import type { ServiceDetailConfig } from './category-style';
import { ServiceCarouselSection } from './service-carousel-section';
import { ShuffledServiceCarouselSection } from './shuffled-service-carousel-section';

export type ServiceTagRailProps = {
  /** Tags de `services.extras.tags` — entra quem tiver PELO MENOS UMA (ex.: `["local:espaco-x"]`). */
  tags: string[];
  /** Sem título: "Neste local" para tag `local:*`, senão "Mais em <tag humanizada>". */
  title?: string;
  subtitleLabel?: string;
  /** Máximo de cards (default 10). */
  limit?: number;
  /** Anúncio fora da lista (o da página). */
  excludeUid?: string;
  excludeUids?: string[];
  /** Cidade (IBGE) e irmãs (`regions`, a 1ª é a selecionada). Sem elas, sem filtro de cidade. */
  cityIbge?: string;
  cityIbges?: string[];
  /** `true` (default): embaralha o pool no navegador a cada visita (página ISR). `false`: ordem do servidor. */
  shuffle?: boolean;
  hue?: number;
  detailConfig?: ServiceDetailConfig | null;
  className?: string;
  /** Com `moreHref` e mais itens que `limit`, a trilha termina num card "Ver mais". */
  moreHref?: string;
  moreLabel?: string;
  showCity?: boolean;
};

/**
 * Carrossel "por tag" — Server Component assíncrono (busca na RPC pública via
 * `loadServicesByTags`) que reaproveita `ShuffledServiceCarouselSection`/`ServiceCarouselSection`.
 * Some sozinho (`null`) quando nenhuma tag é válida ou nenhum anúncio casa. Use em páginas do
 * projeto consumidor (ex.: a página de um local listando os eventos com `local:<slug>`). Não está
 * no barrel `services/detail` de propósito: importa código de servidor; importe pelo caminho do
 * arquivo, só em Server Components.
 */
export async function ServiceTagRail({
  tags,
  title,
  subtitleLabel,
  limit,
  excludeUid,
  excludeUids,
  cityIbge,
  cityIbges,
  shuffle = true,
  hue,
  detailConfig,
  className,
  moreHref,
  moreLabel,
  showCity,
}: ServiceTagRailProps) {
  const data = await loadServicesByTags(tags, { limit, excludeUid, excludeUids, cityIbge, cityIbges });
  if (!data) return null;

  const section = {
    title: title ?? serviceTagRailTitle(orderTagsForRails(normalizeServiceTags(tags))[0] ?? ''),
    subtitleLabel,
    hue,
    detailConfig,
    className,
    moreHref: data.hasMore ? moreHref : undefined,
    moreLabel,
    showCity,
  };
  return shuffle ? (
    <ShuffledServiceCarouselSection {...section} services={data.items} limit={data.limit} />
  ) : (
    <ServiceCarouselSection {...section} services={data.items.slice(0, data.limit)} />
  );
}
