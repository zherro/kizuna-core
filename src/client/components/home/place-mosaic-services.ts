import type { ServiceResult } from '../search/search-types';
import type { PlaceHighlightItem } from './place-highlights';
import { serviceHref } from '../../../shared/city-routing/city-slug';
import { fileUrl } from '../services/service-helpers';

/**
 * Anúncios da busca (`fn_search_services`, ex. o pool de `loadCategoryRail` por grupo ou categoria)
 * → itens do `PlaceMosaic`. Chapéu = subcategoria, senão categoria (é o que os chips filtram);
 * linha de apoio = cidade do endereço principal; foto = capa em tamanho cheio (o mosaico tem peças
 * grandes). Sem título ou repetido (mesmo `uid`) fica de fora; a ordem de entrada é mantida.
 */
export function placeItemsFromServices(
  results: ServiceResult[],
  options: { fallbackKicker?: string } = {}
): PlaceHighlightItem[] {
  const fallbackKicker = options.fallbackKicker ?? 'Lugar';
  const seen = new Set<string>();
  const items: PlaceHighlightItem[] = [];
  for (const r of results) {
    const title = r.title?.trim();
    if (!r.uid || !title || seen.has(r.uid)) continue;
    seen.add(r.uid);
    const meta = r.city?.trim();
    items.push({
      href: serviceHref(r),
      title,
      kicker: r.subcategory?.trim() || r.category?.trim() || fallbackKicker,
      image: r.cover_file_id ? fileUrl(r.cover_file_id, 'full') : null,
      ...(meta ? { meta } : {}),
    });
  }
  return items;
}
