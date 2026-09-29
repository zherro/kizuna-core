import { pgrstTable } from '../postrest/conn';

/**
 * Plugin `location` — de onde vêm estados/cidades do seletor de local e o que fazer com uma
 * cidade detectada (GPS/IP). Lê o bloco `location` do `kizuna.config.json` do projeto:
 *
 *  - `source: "ibge"` (padrão): Brasil inteiro, direto da API de localidades do IBGE.
 *  - `source: "db"`: só o que estiver em `location_state` / `location_city` — a tabela É a lista
 *    de cidades atendidas. Liberar cidade nova = INSERT no seed do projeto.
 *  - `outsideList` (só no modo db): cidade detectada fora da lista → `"prompt"` (nenhum local;
 *    o usuário escolhe) ou `"default"` (cai em `defaultCityIbge`).
 *
 * Ver docs/plugins/location.md.
 */

export type LocationSource = 'ibge' | 'db';
export type LocationOutsideList = 'prompt' | 'default';

export interface LocationConfig {
  source: LocationSource;
  outsideList: LocationOutsideList;
  /** Código IBGE (7 dígitos) da cidade padrão — obrigatório com `outsideList: "default"`. */
  defaultCityIbge: string | null;
}

export interface LocationStateItem {
  id: number;
  sigla: string;
  nome: string;
}

/** Mesmo shape de sempre de `/api/location/cities`: id IBGE como `value`. */
export interface LocationCityItem {
  value: string;
  label: string;
}

export interface ResolvedLocation {
  stateCode: string;
  stateName: string;
  cityId: number;
  cityName: string;
}

/** Valida o bloco `location` do kizuna.config.json. Sem bloco = comportamento antigo (IBGE). */
export function parseLocationConfig(raw: unknown): LocationConfig {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const source = obj.source ?? 'ibge';
  if (source !== 'ibge' && source !== 'db') {
    throw new Error(
      `kizuna.config.json: location.source inválido (${String(source)}) — use "ibge" ou "db".`
    );
  }
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
  return { source, outsideList, defaultCityIbge };
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

// ─── Fonte: banco (location_state / location_city) ────────────────────────────

type DbStateRow = { id: number; code: string; name: string };
type DbCityRow = {
  id: number;
  name: string;
  location_state: { code: string; name: string };
};

const CITY_SELECT = 'id,name,location_state!inner(code,name)';

async function dbGet<T>(path: string): Promise<T[]> {
  // Tabelas em `public` (o schema padrão do PostgREST é `auth`) e leitura aberta a anon —
  // sem Authorization, igual às outras leituras públicas de catálogo.
  const res = await pgrstTable(path, { headers: { 'Accept-Profile': 'public' } }, { auth: null });
  if (!res.ok) throw new Error(`location: PostgREST ${res.status} em ${path}`);
  const data = (await res.json().catch(() => [])) as unknown;
  return Array.isArray(data) ? (data as T[]) : [];
}

async function dbCitiesOf(uf: string): Promise<DbCityRow[]> {
  return dbGet<DbCityRow>(
    `/location_city?select=${CITY_SELECT}&location_state.code=eq.${encodeURIComponent(uf)}&order=name`
  );
}

function fromDbCity(row: DbCityRow): ResolvedLocation {
  return {
    stateCode: row.location_state.code,
    stateName: row.location_state.name,
    cityId: row.id,
    cityName: row.name,
  };
}

// ─── Fonte: IBGE (com cache em memória) ───────────────────────────────────────

const IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades';
const IBGE_STATES_TTL_MS = 7 * 24 * 60 * 60_000;
const IBGE_CITIES_TTL_MS = 24 * 60 * 60_000;

let ibgeStatesCache: { at: number; items: LocationStateItem[] } | null = null;
const ibgeCitiesCache = new Map<string, { at: number; items: LocationCityItem[] }>();

/** Só para testes. */
export function __resetLocationCache() {
  ibgeStatesCache = null;
  ibgeCitiesCache.clear();
}

async function ibgeStates(): Promise<LocationStateItem[]> {
  if (ibgeStatesCache && Date.now() - ibgeStatesCache.at < IBGE_STATES_TTL_MS) {
    return ibgeStatesCache.items;
  }
  const res = await fetch(`${IBGE}/estados?orderBy=nome`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`location: IBGE ${res.status} (estados)`);
  const data = (await res.json().catch(() => [])) as LocationStateItem[];
  const items = Array.isArray(data)
    ? data.map((s) => ({ id: s.id, sigla: s.sigla, nome: s.nome }))
    : [];
  ibgeStatesCache = { at: Date.now(), items };
  return items;
}

async function ibgeCities(uf: string): Promise<LocationCityItem[]> {
  const cached = ibgeCitiesCache.get(uf);
  if (cached && Date.now() - cached.at < IBGE_CITIES_TTL_MS) return cached.items;
  const res = await fetch(`${IBGE}/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`location: IBGE ${res.status} (municípios de ${uf})`);
  const data = (await res.json().catch(() => [])) as Array<{
    id: number;
    nome: string;
  }>;
  const items = Array.isArray(data)
    ? data.map((c) => ({ value: String(c.id), label: c.nome }))
    : [];
  ibgeCitiesCache.set(uf, { at: Date.now(), items });
  return items;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function listLocationStates(cfg: LocationConfig): Promise<LocationStateItem[]> {
  if (cfg.source === 'ibge') return ibgeStates();
  const rows = await dbGet<DbStateRow>('/location_state?select=id,code,name&order=name');
  return rows.map((s) => ({ id: s.id, sigla: s.code, nome: s.name }));
}

export async function listLocationCities(
  cfg: LocationConfig,
  uf: string
): Promise<LocationCityItem[]> {
  const code = normalizeUf(uf);
  if (!code || code === 'ALL') return [];
  if (cfg.source === 'ibge') return ibgeCities(code);
  const rows = await dbCitiesOf(code);
  return rows.map((c) => ({ value: String(c.id), label: c.name }));
}

/**
 * Converte uma localização detectada (GPS/IP — só UF + nome da cidade) numa cidade válida:
 *  - modo db: cidade da lista; fora dela → cidade padrão (`outsideList: "default"`) ou null;
 *  - modo ibge: acha o código IBGE pelo nome; sem match mantém a cidade com id 0 (sem restrição).
 * null = "não há local válido — abrir o seletor".
 */
export async function resolveLocation(
  cfg: LocationConfig,
  input: { uf?: string | null; city?: string | null }
): Promise<ResolvedLocation | null> {
  const uf = normalizeUf(input.uf);
  const city = String(input.city ?? '').trim();

  if (cfg.source === 'ibge') {
    if (!uf) return null;
    const states = await ibgeStates();
    const stateName = states.find((s) => s.sigla === uf)?.nome ?? uf;
    if (!city) return { stateCode: uf, stateName, cityId: 0, cityName: '' };
    const cities = await ibgeCities(uf);
    const match = cities.find((c) => normalizeName(c.label) === normalizeName(city));
    return {
      stateCode: uf,
      stateName,
      cityId: match ? Number(match.value) || 0 : 0,
      cityName: match ? match.label : city,
    };
  }

  if (uf && city) {
    const match = (await dbCitiesOf(uf)).find((c) => normalizeName(c.name) === normalizeName(city));
    if (match) return fromDbCity(match);
  }

  if (cfg.outsideList !== 'default' || !cfg.defaultCityIbge) return null;
  const [fallback] = await dbGet<DbCityRow>(
    `/location_city?select=${CITY_SELECT}&id=eq.${encodeURIComponent(cfg.defaultCityIbge)}&limit=1`
  );
  return fallback ? fromDbCity(fallback) : null;
}
