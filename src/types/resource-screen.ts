export type ResourceScreenFieldBase = {
  name: string;
  label: string;
  required?: boolean;
};

export type ResourceScreenTextField = ResourceScreenFieldBase & {
  type: 'text';
  placeholder?: string;
};

export type ResourceScreenTextareaField = ResourceScreenFieldBase & {
  type: 'textarea';
  placeholder?: string;
  maxLength?: number;
  rows?: number;
};

export type ResourceScreenSwitchField = ResourceScreenFieldBase & {
  type: 'switch';
  defaultValue?: boolean;
};

export type ResourceScreenRelationField = ResourceScreenFieldBase & {
  type: 'relation';
  optionsResource: string;
  optionsLabelField?: string;
  optionsFilter?: Record<string, string | number | boolean>;
  placeholder?: string;
};

export type ResourceScreenSelectField = ResourceScreenFieldBase & {
  type: 'select';
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export type ResourceScreenField =
  | ResourceScreenTextField
  | ResourceScreenTextareaField
  | ResourceScreenSwitchField
  | ResourceScreenRelationField
  | ResourceScreenSelectField;

export type ResourceScreenListConfig = {
  primaryField: string;
  secondaryField?: string;
  statusField?: string;
  descriptionField?: string;
  relationLabelPrefix?: string;
};

export type ResourceScreenMessages = {
  saveError?: string;
  saveSuccess?: string;
  connectionError?: string;
  deleteError?: string;
  deleteSuccess?: string;
};

export type ResourceScreenConfig = {
  resource: string;
  entitySingular: string;
  entityPlural: string;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  searchPlaceholder?: string;
  emptyMessage?: string;
  requireRelationToCreate?: boolean;
  fields: ResourceScreenField[];
  list: ResourceScreenListConfig;
  messages?: ResourceScreenMessages;
};
