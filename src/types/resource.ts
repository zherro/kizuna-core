type RecordValue = Record<string, unknown>;

export function parseActive(value: unknown) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 't';
  }
  return true;
}

export function makeSlug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type ResourceConfig = {
  schema?: string;
  table: string;
  listRequiresAuth?: boolean;
  returnRepresentation?: boolean;
  returnCountPreferDisabled?: boolean;
  select: string;
  primaryKey: string;
  defaultOrder?: string;
  searchableColumns: string[];
  maxPageSize?: number;
  requiredFields?: string[];
  softDeleteField?: string;
  mapInput?: (input: RecordValue) => RecordValue;
  mapOutput?: (record: RecordValue) => RecordValue;
};

export type RpcConfig = {
  schema?: string;
  requiresAuth?: boolean;
};
