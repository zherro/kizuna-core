/**
 * Cidades do filtro da busca — lógica pura + carga única (cache em módulo).
 *
 * As cidades vêm de `GET /api/location/cities` (o mesmo catálogo do seletor do cabeçalho), mas o
 * filtro NÃO usa o `LocationModal`: aquele troca a cidade do cabeçalho; aqui o usuário só escolhe
 * em quais cidades buscar.
 */

export type CityOption = {
  /** código IBGE (string) */
  value: string;
  label: string;
  stateCode: string;
  stateName: string;
};

/** Quantas cidades o mini-seletor mostra por vez. */
export const CITY_PICKER_LIMIT = 8;

export const normalizeText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();

/**
 * Busca sem acento/caixa; cidades já escolhidas ficam de fora. Quem COMEÇA com o termo vem antes de
 * quem só contém; a ordem alfabética do catálogo é mantida dentro de cada metade.
 */
export function searchCities(
  cities: CityOption[],
  query: string,
  excludeIds: string[] = [],
  limit = CITY_PICKER_LIMIT
): CityOption[] {
  const q = normalizeText(query);
  const taken = new Set(excludeIds);
  const free = cities.filter((c) => !taken.has(c.value));
  if (!q) return free.slice(0, limit);
  const starts: CityOption[] = [];
  const contains: CityOption[] = [];
  for (const c of free) {
    const label = normalizeText(c.label);
    if (label.startsWith(q)) starts.push(c);
    else if (label.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Mesmo conjunto de cidades, independente da ordem. */
export function sameCitySet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** Rótulo do chip: nome da cidade; enquanto o catálogo não chega (ou se faltar), cai num texto neutro. */
export function cityLabel(cities: CityOption[], id: string, loading = false): string {
  const found = cities.find((c) => c.value === id);
  if (found) return found.label;
  return loading ? 'Carregando…' : `Cidade ${id}`;
}

// ─── Carga única ───────────────────────────────────────────────────────────────────────────

let citiesPromise: Promise<CityOption[]> | null = null;

/** Uma requisição só por sessão de página (os 3 painéis da busca compartilham). Falha não fica em cache. */
export function loadCities(): Promise<CityOption[]> {
  if (!citiesPromise) {
    citiesPromise = fetch('/api/location/cities')
      .then(async (res) => {
        if (!res.ok) throw new Error('cities');
        const data = (await res.json()) as { items?: unknown };
        return Array.isArray(data.items) ? (data.items as CityOption[]) : [];
      })
      .catch((err) => {
        citiesPromise = null;
        throw err;
      });
  }
  return citiesPromise;
}

/** Só para testes. */
export function __resetCitiesCache(): void {
  citiesPromise = null;
}
