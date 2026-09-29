import { pgrstTable } from '../postrest/conn';

/**
 * Plugin `location` — cidades do seletor de local (header / /busca) e o que fazer com uma cidade
 * detectada por GPS/IP. A lista é o banco: `location_city WHERE search_city` (plugin location
 * 1.1.0, `0002_location_search_city.sql`). Liberar cidade = `UPDATE ... SET search_city = true`.
 *
 * Bloco `location` do `kizuna.config.json`:
 *  - `outsideList`: cidade detectada fora da lista → `"prompt"` (nenhum local; o usuário escolhe)
 *    ou `"default"` (cai em `defaultCityIbge`, que também precisa estar marcada).
 *
 * Ver docs/plugins/location.md.
 */

export type LocationOutsideList = 'prompt' | 'default';

export interface LocationConfig {
  outsideList: LocationOutsideList;
  /** Código IBGE (7 dígitos) da cidade padrão — obrigatório com `outsideList: "default"`. */
  defaultCityIbge: string | null;
}

/** Item de `/api/location/cities`: código IBGE como `value`, UF para exibir ao lado do nome. */
export interface LocationCityItem {
  value: string;
  label: string;
  stateCode: string;
  stateName: string;
}

export interface ResolvedLocation {
  stateCode: string;
  stateName: string;
  cityId: number;
  cityName: string;
}

/** Valida o bloco `location` do kizuna.config.json. Sem bloco = `prompt`, sem cidade padrão. */
export function parseLocationConfig(raw: unknown): LocationConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const outsideList = obj.outsideList ?? 'prompt';
  if (outsideList !== 'prompt' && outsideList !== 'default') {
    throw new Error(
      `kizuna.config.json: location.outsideList inválido (${String(outsideList)}) — use "prompt" ou "default".`
    );
  }
  const rawDefault = obj.defaultCityIbge;
  const defaultCityIbge =
    rawDefault === undefined || rawDefault === null || rawDefault === ''
      ? null
      : String(rawDefault).trim();
  if (outsideList === 'default' && !defaultCityIbge) {
    throw new Error(
      'kizuna.config.json: location.outsideList "default" exige location.defaultCityIbge.'
    );
  }
  if (defaultCityIbge && !/^\d{7}$/.test(defaultCityIbge)) {
    throw new Error(
      `kizuna.config.json: location.defaultCityIbge deve ter 7 dígitos (${defaultCityIbge}).`
    );
  }
  return { outsideList, defaultCityIbge };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeName(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeUf(uf: string | null | undefined) {
  return String(uf ?? '')
    .trim()
    .toUpperCase();
}

// ─── Banco (location_city WHERE search_city) ──────────────────────────────────

type DbCityRow = {
  id: number;
  name: string;
  location_state: { code: string; name: string };
};

// `search_city=is.true` sempre: usa o índice parcial idx_location_city_search_city.
const CITIES = '/location_city?select=id,name,location_state!inner(code,name)&search_city=is.true';

async function dbCities(filter = ''): Promise<DbCityRow[]> {
  const path = `${CITIES}${filter}&order=name`;
  // Tabelas em `public` (o schema padrão do PostgREST é `auth`) e leitura aberta a anon —
  // sem Authorization, igual às outras leituras públicas de catálogo.
  const res = await pgrstTable(path, { headers: { 'Accept-Profile': 'public' } }, { auth: null });
  if (!res.ok) throw new Error(`location: PostgREST ${res.status} em ${path}`);
  const data = (await res.json().catch(() => [])) as unknown;
  return Array.isArray(data) ? (data as DbCityRow[]) : [];
}

function fromDbCity(row: DbCityRow): ResolvedLocation {
  return {
    stateCode: row.location_state.code,
    stateName: row.location_state.name,
    cityId: row.id,
    cityName: row.name,
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Cidades do seletor, por nome. `uf` opcional restringe a um estado. */
export async function listLocationCities(uf?: string | null): Promise<LocationCityItem[]> {
  const code = normalizeUf(uf);
  const rows = await dbCities(code ? `&location_state.code=eq.${encodeURIComponent(code)}` : '');
  return rows.map((c) => ({
    value: String(c.id),
    label: c.name,
    stateCode: c.location_state.code,
    stateName: c.location_state.name,
  }));
}

/**
 * Converte uma localização detectada (GPS/IP — só UF + nome da cidade) numa cidade da lista;
 * fora dela → cidade padrão (`outsideList: "default"`) ou null ("abrir o seletor").
 */
export async function resolveLocation(
  cfg: LocationConfig,
  input: { uf?: string | null; city?: string | null }
): Promise<ResolvedLocation | null> {
  const uf = normalizeUf(input.uf);
  const city = String(input.city ?? '').trim();

  if (uf && city) {
    const match = (await dbCities(`&location_state.code=eq.${encodeURIComponent(uf)}`)).find(
      (c) => normalizeName(c.name) === normalizeName(city)
    );
    if (match) return fromDbCity(match);
  }

  if (cfg.outsideList !== 'default' || !cfg.defaultCityIbge) return null;
  const [fallback] = await dbCities(`&id=eq.${encodeURIComponent(cfg.defaultCityIbge)}&limit=1`);
  return fallback ? fromDbCity(fallback) : null;
}
