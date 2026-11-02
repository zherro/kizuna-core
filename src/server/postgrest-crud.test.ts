import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/resources', () => ({ postgrestResources: {}, postgrestRpcs: {} }));
vi.mock('./auth', () => ({ getAuthHeaderFromCookies: vi.fn(), getSession: vi.fn() }));
vi.mock('./postrest/conn', () => ({ pgrstRpc: vi.fn(), pgrstTable: vi.fn() }));

import { pickToggleInput } from './postgrest-crud';

const config = {
  table: 'services',
  select: '*',
  primaryKey: 'id',
  searchableColumns: [],
  toggleFields: ['active'],
};

describe('pickToggleInput', () => {
  it('corpo só com campo de toggle booleano passa direto', () => {
    expect(pickToggleInput(config, { active: false })).toEqual({ active: false });
  });

  it('qualquer outra chave, valor não booleano ou corpo vazio cai no fluxo normal', () => {
    expect(pickToggleInput(config, { active: false, status: 'active' })).toBeNull();
    expect(pickToggleInput(config, { active: 'false' })).toBeNull();
    expect(pickToggleInput(config, {})).toBeNull();
    expect(pickToggleInput({ ...config, toggleFields: undefined }, { active: true })).toBeNull();
  });
});
