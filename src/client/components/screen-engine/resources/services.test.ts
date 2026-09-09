import { describe, expect, it } from 'vitest';
import { resourceServices } from './services';

describe('resourceServices', () => {
  it('expõe as três chaves', () => {
    expect(Object.keys(resourceServices).sort()).toEqual(
      ['service_categories_sub', 'service_moderations', 'services'],
    );
  });

  it('services.mapInput lê aliases camelCase', () => {
    const out = resourceServices.services.mapInput!({
      categoryId: '10', categoryGroupId: '3', startingPrice: 50, priceUnit: 'hour', title: 'x',
    });
    expect(out.category_id).toBe(10);
    expect(out.category_group_id).toBe(3);
    expect(out.starting_price).toBe(50);
    expect(out.price_unit).toBe('hour');
  });

  it('services.mapInput projeta todas as colunas snake_case a partir de um registro snake', () => {
    const out = resourceServices.services.mapInput!({
      title: ' Barbeiro ', category_id: 7, category_group_id: 2, status: 'active',
      service_location: 'remoto', starting_price: 120, price_unit: 'quote',
    });
    expect(out.title).toBe('Barbeiro');
    expect(out.category_id).toBe(7);
    expect(out.status).toBe('active');
    expect(out.service_location).toBe('remoto');
    expect(out.starting_price).toBe(120);
  });

  it('services.mapInput normaliza service_location vazio pra null', () => {
    const out = resourceServices.services.mapInput!({ serviceLocation: '', title: 'x', categoryId: '1' });
    expect(out.service_location).toBeNull();
  });

  it('service_moderations.mapInput é no-op (escrita só via RPC)', () => {
    expect(resourceServices.service_moderations.mapInput!({ decision: 'approved' })).toEqual({});
  });

  it('service_moderations.mapOutput lê reviewerId de created_by', () => {
    const out = resourceServices.service_moderations.mapOutput!({ id: 1, created_by: 'u1', decision: 'approved' });
    expect(out.reviewerId).toBe('u1');
  });
});
