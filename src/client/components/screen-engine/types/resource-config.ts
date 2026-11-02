type RecordValue = Record<string, unknown>;

export type ResourceConfig = {
  schema?: string;
  table: string;
  listRequiresAuth?: boolean;
  /**
   * Só com `listRequiresAuth: false`: segundos de cache HTTP (navegador + CDN) da listagem. Para
   * dados públicos que mudam pouco (taxonomia da home) — evita bater no PostgREST a cada visita.
   */
  publicCacheSeconds?: number;
  returnRepresentation?: boolean;
  returnCountPreferDisabled?: boolean;
  /**
   * POST vira upsert: colunas do conflito (ex. `'user_id,service_uid'`). Se a linha já existe, os
   * campos enviados a atualizam (`on_conflict` + `Prefer: resolution=merge-duplicates`).
   */
  upsertOn?: string;
  select: string;
  primaryKey: string;
  defaultOrder?: string;
  searchableColumns: string[];
  /** Colunas numéricas (ex.: id) buscadas por igualdade quando o termo é só dígitos (`01` → 1). */
  searchableNumericColumns?: string[];
  /** Overrides the default 100-row cap on ?pageSize= — use for small reference tables that a screen needs to load in full (e.g. a tree view). */
  maxPageSize?: number;
  requiredFields?: string[];
  /** Boolean column name. When set, delete becomes PATCH {field: true} instead of a real DELETE, and list/getById exclude rows where it's true. */
  softDeleteField?: string;
  /**
   * Colunas booleanas que aceitam PATCH parcial: corpo SÓ com essas chaves vai direto ao PostgREST,
   * sem `mapInput` nem `requiredFields` (que preencheriam o resto do registro com padrões). Ex.:
   * `['active']` — o switch de ativar/inativar da listagem. RLS/triggers continuam valendo.
   */
  toggleFields?: string[];
  mapInput?: (input: RecordValue) => RecordValue;
  mapOutput?: (record: RecordValue) => RecordValue;
};
