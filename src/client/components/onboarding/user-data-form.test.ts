import { describe, expect, it, vi } from 'vitest';

// O módulo do form puxa provedores de cliente; o schema não depende deles.
vi.mock('@kizuna/core/client/providers/auth-provider', () => ({ useAuth: () => ({}) }));
vi.mock('@kizuna/core/client', () => ({ useForm: () => ({}) }));

import { buildValidationSchema } from './user-data-form';
import { DEFAULT_USER_DATA_FIELDS_CONFIG } from './user-data-fields-config';

const onlyName = {
  fullName: 'Maria da Silva',
  displayName: 'maria',
  phone: '',
  email: '',
  documentType: 'cpf',
  documentNumber: '',
  birthDate: '',
  zipCode: '',
  state: '',
  city: '',
  cityIbge: '',
  bio: '',
  avatarUrl: '',
};

describe('buildValidationSchema — endereço ao salvar', () => {
  it('padrão: exige estado e cidade (comportamento de sempre)', async () => {
    const schema = buildValidationSchema(DEFAULT_USER_DATA_FIELDS_CONFIG);
    await expect(schema.validate(onlyName, { abortEarly: false })).rejects.toMatchObject({
      errors: expect.arrayContaining(['Informe o estado.', 'Informe a cidade.']),
    });
  });

  it('addressOptionalOnSave: salva só com o nome', async () => {
    const schema = buildValidationSchema(DEFAULT_USER_DATA_FIELDS_CONFIG, true);
    await expect(schema.validate(onlyName)).resolves.toBeTruthy();
  });

  it('addressOptionalOnSave não afrouxa o nome', async () => {
    const schema = buildValidationSchema(DEFAULT_USER_DATA_FIELDS_CONFIG, true);
    await expect(schema.validate({ ...onlyName, fullName: '' })).rejects.toThrow(
      'Informe o nome completo.'
    );
  });
});
