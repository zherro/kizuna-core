import type { ResourceConfig } from '../types/resource-config';

/**
 * `ResourceConfig` do plugin `user_data` (plugins/user_data): perfil da conta usado por Minha conta
 * (`AccountForm`). A RLS limita cada usuário à própria linha. `email_verification_code` fica de fora
 * do select de propósito — o código de verificação nunca volta pela API.
 */
type RecordValue = Record<string, unknown>;

const FIELDS: Array<[camel: string, column: string]> = [
  ['userId', 'user_id'],
  ['fullName', 'full_name'],
  ['displayName', 'display_name'],
  ['avatarUrl', 'avatar_url'],
  ['bio', 'bio'],
  ['phone', 'phone'],
  ['email', 'email'],
  ['state', 'state'],
  ['city', 'city'],
  ['cityIbge', 'city_ibge'],
  ['zipCode', 'zip_code'],
  ['documentType', 'document_type'],
  ['documentNumber', 'document_number'],
  ['birthDate', 'birth_date'],
];

const emptyToNull = (value: unknown) => (value === '' || value === undefined ? null : value);

const USER_DATA: ResourceConfig = {
  schema: 'public',
  table: 'user_data',
  listRequiresAuth: true,
  returnRepresentation: true,
  select:
    'id,user_id,full_name,display_name,avatar_url,bio,phone,phone_verified,email,email_verified,state,city,city_ibge,zip_code,document_type,document_number,birth_date,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: ['full_name', 'display_name'],
  maxPageSize: 1,
  mapInput: (input) => {
    const out: RecordValue = {};
    for (const [camel, column] of FIELDS) {
      if (input[camel] !== undefined) out[column] = emptyToNull(input[camel]);
    }
    out.updated_at = new Date().toISOString();
    return out;
  },
  mapOutput: (record) => {
    const out: RecordValue = { id: record.id, emailVerified: record.email_verified === true };
    for (const [camel, column] of FIELDS) out[camel] = record[column] ?? '';
    out.phoneVerified = record.phone_verified === true;
    return out;
  },
};

export const resourceUserData: Record<string, ResourceConfig> = { user_data: USER_DATA };
