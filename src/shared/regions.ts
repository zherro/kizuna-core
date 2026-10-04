/**
 * Regiões (kizuna.config.json → `regions`): agrupam cidades vizinhas para SUGERIR anúncios além da
 * cidade selecionada — o seletor continua escolhendo uma cidade só, e ela vem sempre primeiro.
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
 * Para a cidade selecionada: 1º as outras cidades da mesma região, depois as regiões sugeridas a
 * ela. Cidade fora de qualquer região → nenhuma sugestão.
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
  const neighbors = home.cities.filter((c) => c !== city);
  if (neighbors.length > 0) groups.push({ key: home.key, title: home.title, cities: neighbors });
  for (const r of regions) {
    if (r.key === home.key || !r.suggestTo?.includes(home.key)) continue;
    const cities = r.cities.filter((c) => c !== city);
    if (cities.length > 0) groups.push({ key: r.key, title: r.title, cities });
  }
  return groups;
}

/** Cidade selecionada + vizinhas da mesma região (sem sugestões) — ex.: carrossel "pela região". */
export function regionCitiesFor(
  regions: RegionConfig[],
  cityIbge: string | number | null | undefined
): string[] {
  const city = cityIbge == null ? '' : String(cityIbge);
  if (!city) return [];
  const home = regions.find((r) => r.cities.includes(city));
  return home ? [city, ...home.cities.filter((c) => c !== city)] : [city];
}
