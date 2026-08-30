type RecordValue = Record<string, unknown>;

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
  /** Overrides the default 100-row cap on ?pageSize= — use for small reference tables that a screen needs to load in full (e.g. a tree view). */
  maxPageSize?: number;
  requiredFields?: string[];
  /** Boolean column name. When set, delete becomes PATCH {field: true} instead of a real DELETE, and list/getById exclude rows where it's true. */
  softDeleteField?: string;
  mapInput?: (input: RecordValue) => RecordValue;
  mapOutput?: (record: RecordValue) => RecordValue;
};
