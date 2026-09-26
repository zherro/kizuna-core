import { describe, expect, it } from 'vitest';
import { resourceServices } from './services';

describe('resourceServices', () => {
  it('expõe as cinco chaves', () => {
    expect(Object.keys(resourceServices).sort()).toEqual([
      'category_service_stats',
      'service_addresses',
      'service_categories_sub',
      'service_moderations',
      'services',
    ]);
  });

  it('services.mapInput lê aliases camelCase', () => {
    const out = resourceServices.services.mapInput!({
      categoryId: '10',
      categoryGroupId: '3',
      startingPrice: 50,
      priceUnit: 'hour',
      title: 'x',
    });
    expect(out.category_id).toBe(10);
    expect(out.category_group_id).toBe(3);
    expect(out.starting_price).toBe(50);
    expect(out.price_unit).toBe('hour');
  });

  it('services.mapInput projeta todas as colunas snake_case a partir de um registro snake', () => {
    const out = resourceServices.services.mapInput!({
      title: ' Barbeiro ',
      category_id: 7,
      category_group_id: 2,
      status: 'active',
      service_location: 'remoto',
      starting_price: 120,
      price_unit: 'quote',
    });
    expect(out.title).toBe('Barbeiro');
    expect(out.category_id).toBe(7);
    expect(out.status).toBe('active');
    expect(out.service_location).toBe('remoto');
    expect(out.starting_price).toBe(120);
  });

  it('services.mapInput normaliza service_location vazio pra null', () => {
    const out = resourceServices.services.mapInput!({
      serviceLocation: '',
      title: 'x',
      categoryId: '1',
    });
    expect(out.service_location).toBeNull();
  });

  it('service_moderations.mapInput é no-op (escrita só via RPC)', () => {
    expect(resourceServices.service_moderations.mapInput!({ decision: 'approved' })).toEqual({});
  });

  it('service_moderations.mapOutput lê reviewerId de created_by', () => {
    const out = resourceServices.service_moderations.mapOutput!({
      id: 1,
      created_by: 'u1',
      decision: 'approved',
    });
    expect(out.reviewerId).toBe('u1');
  });

  it('service_addresses: config básica', () => {
    const c = resourceServices.service_addresses;
    expect(c.requiredFields).toEqual(['service_id']);
    expect(c.maxPageSize).toBe(50);
  });

  it('service_addresses.mapInput lê camelCase e nunca emite tenant/created_by', () => {
    const out = resourceServices.service_addresses.mapInput!({
      serviceId: '5',
      zipCode: '78000-000',
      street: ' Rua A ',
      number: '10',
      state: 'mt',
      cityIbge: '5103403',
      latitude: '-15.6',
      longitude: null,
      isPrimary: true,
      tenant_id: 'x',
      created_by: 'y',
    });
    expect(out.service_id).toBe(5);
    expect(out.zip_code).toBe('78000000');
    expect(out.street).toBe('Rua A');
    expect(out.state).toBe('MT');
    expect(out.city_ibge).toBe('5103403');
    expect(out.latitude).toBe(-15.6);
    expect(out.longitude).toBeNull();
    expect(out.is_primary).toBe(true);
    expect(out).not.toHaveProperty('tenant_id');
    expect(out).not.toHaveProperty('created_by');
    expect(out).not.toHaveProperty('serviceId');
  });

  it('service_addresses.mapInput aceita snake_case e vazio vira null', () => {
    const out = resourceServices.service_addresses.mapInput!({
      service_id: 2,
      zip_code: '',
      is_primary: false,
    });
    expect(out.service_id).toBe(2);
    expect(out.zip_code).toBeNull();
    expect(out.is_primary).toBe(false);
  });

  it('service_addresses.mapOutput usa camelCase, ids em string e coords number', () => {
    const out = resourceServices.service_addresses.mapOutput!({
      id: 9,
      service_id: 5,
      zip_code: '78000000',
      city_ibge: '5103403',
      latitude: '-15.600000',
      longitude: '-56.100000',
      is_primary: true,
      active: true,
    });
    expect(out.id).toBe('9');
    expect(out.serviceId).toBe('5');
    expect(out.zipCode).toBe('78000000');
    expect(out.cityIbge).toBe('5103403');
    expect(out.latitude).toBe(-15.6);
    expect(out.longitude).toBe(-56.1);
    expect(out.isPrimary).toBe(true);
  });

  it('services: select inclui expires_at', () => {
    expect(resourceServices.services.select).toContain('expires_at');
  });

  it('services.mapInput normaliza expiresAt/expires_at: ISO válido → ISO, vazio/inválido → null', () => {
    const map = (extra: Record<string, unknown>) =>
      resourceServices.services.mapInput!({ title: 'x', categoryId: 1, ...extra }).expires_at;
    expect(map({ expiresAt: '2026-12-31T02:59:59.999Z' })).toBe('2026-12-31T02:59:59.999Z');
    expect(map({ expires_at: '2026-12-31T02:59:59.999Z' })).toBe('2026-12-31T02:59:59.999Z');
    expect(map({ expiresAt: '2026-12-31T02:59:59Z' })).toBe('2026-12-31T02:59:59.000Z');
    expect(map({ expiresAt: '' })).toBeNull();
    expect(map({ expiresAt: '   ' })).toBeNull();
    expect(map({ expiresAt: 'não é data' })).toBeNull();
    expect(map({ expiresAt: null })).toBeNull();
    expect(map({})).toBeNull();
  });

  it('services.mapOutput expõe expiresAt (ISO ou null)', () => {
    const out = resourceServices.services.mapOutput!({
      id: 1,
      expires_at: '2026-12-31T02:59:59.999Z',
    });
    expect(out.expiresAt).toBe('2026-12-31T02:59:59.999Z');
    expect(resourceServices.services.mapOutput!({ id: 1 }).expiresAt).toBeNull();
    expect(resourceServices.services.mapOutput!({ id: 1, expires_at: null }).expiresAt).toBeNull();
  });
});
