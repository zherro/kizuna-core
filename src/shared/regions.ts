/**
 * Regiões (kizuna.config.json → `regions`): cidades irmãs que funcionam como UMA praça — todo filtro
 * por cidade de uma delas inclui as outras (busca, swipe, carrosséis da home), com a selecionada
 * primeiro. O seletor continua escolhendo uma cidade só.
 *
 *   { "key": "grande-cuiaba", "title": "Também na Grande Cuiabá", "cities": ["5103403", "5108402"] }
 *   { "key": "chapada", "title": "Para o fim de semana", "cities": ["5103007"], "suggestTo": ["grande-cuiaba"] }
 *
 * `cities` = códigos IBGE. `suggestTo` = regiões cujos visitantes também veem esta como sugestão.
 */
export type RegionConfig = {
  key: string;
  title: string;
  cities: string[];
  suggestTo?: string[];
};

/** Um bloco de sugestão: título + cidades a buscar (sem a cidade selecionada). */
export type RegionGroup = { key: string; title: string; cities: string[] };

export function parseRegions(raw: unknown): RegionConfig[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const obj = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    const cities = Array.isArray(obj.cities)
      ? obj.cities.map((c) => String(c).trim()).filter(Boolean)
      : [];
    if (!obj.key || cities.length === 0) return [];
    return [
      {
        key: String(obj.key),
        title: String(obj.title ?? obj.key),
        cities,
        suggestTo: Array.isArray(obj.suggestTo) ? obj.suggestTo.map(String) : [],
      },
    ];
  });
}

/**
 * Seções de SUGESTÃO para a cidade selecionada: as regiões com `suggestTo` apontando para a região
 * dela. As irmãs da mesma região não entram — já vêm fundidas no resultado (`withRegionCities`).
 * Cidade fora de qualquer região → nenhuma sugestão.
 */
export function regionGroupsFor(
  regions: RegionConfig[],
  cityIbge: string | number | null | undefined
): RegionGroup[] {
  const city = cityIbge == null ? '' : String(cityIbge);
  if (!city) return [];
  const home = regions.find((r) => r.cities.includes(city));
  if (!home) return [];
  const groups: RegionGroup[] = [];
  for (const r of regions) {
    if (r.key === home.key || !r.suggestTo?.includes(home.key)) continue;
    const cities = r.cities.filter((c) => c !== city);
    if (cities.length > 0) groups.push({ key: r.key, title: r.title, cities });
  }
  return groups;
}

/** Cidade selecionada + irmãs da mesma região (sem sugestões) — a selecionada primeiro. */
export function regionCitiesFor(
  regions: RegionConfig[],
  cityIbge: string | number | null | undefined
): string[] {
  const city = cityIbge == null ? '' : String(cityIbge);
  if (!city) return [];
  const home = regions.find((r) => r.cities.includes(city));
  return home ? [city, ...home.cities.filter((c) => c !== city)] : [city];
}

/**
 * Mapper do body da `fn_search_services` (`RpcConfig.mapParams`): com `p_city_ibge` de uma cidade
 * que tem irmãs, preenche `p_city_ibges` = [selecionada, ...irmãs]. Assim todo filtro por cidade
 * que passa pelo proxy (busca, swipe) inclui as irmãs sem cada tela lembrar disso.
 */
export function withRegionCities(regions: RegionConfig[]) {
  return <T extends Record<string, unknown>>(body: T): T => {
    if (Array.isArray(body.p_city_ibges)) return body;
    const city = body.p_city_ibge;
    if (typeof city !== 'string' && typeof city !== 'number') return body;
    const cities = regionCitiesFor(regions, city);
    return cities.length > 1 ? { ...body, p_city_ibges: cities } : body;
  };
}
