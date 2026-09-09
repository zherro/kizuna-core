import { describe, expect, it } from 'vitest';
import { resourceServices } from './services';

describe('resourceServices', () => {
  it('expõe as três chaves', () => {
    expect(Object.keys(resourceServices).sort()).toEqual(
      ['service_categories_sub', 'service_moderations', 'services'],
    );
  });

  it('services.mapInput preserva campos não mencionados (read-merge-write)', () => {
    const out = resourceServices.services.mapInput!({
      status: 'active', description: '<p>x</p>', title: ' Barbeiro ',
      categoryId: '10', categoryGroupId: '3',
    });
    expect(out.title).toBe('Barbeiro');
    expect(out.status).toBe('active'); // não resetou pra 'pending'
    expect(out.category_id).toBe(10);
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
