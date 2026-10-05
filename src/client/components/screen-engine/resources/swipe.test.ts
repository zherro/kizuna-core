import { describe, it, expect } from 'vitest';
import { resourceServiceReactions } from './swipe';

const cfg = resourceServiceReactions.service_reactions;

describe('service_reactions', () => {
  it('favorito implica gostei', () => {
    expect(cfg.mapInput!({ serviceUid: 'u1', liked: false, favorite: true })).toEqual({
      service_uid: 'u1',
      action: 'like',
      favorite: true,
    });
  });
  it('sem gostei vira skip e sem favorito', () => {
    expect(cfg.mapInput!({ serviceUid: 'u1', liked: false, favorite: false })).toEqual({
      service_uid: 'u1',
      action: 'skip',
      favorite: false,
    });
  });
  it('curtir sem mandar favorito não mexe no favorito (upsert só atualiza o que vai)', () => {
    expect(cfg.mapInput!({ serviceUid: 'u1', liked: true })).toEqual({
      service_uid: 'u1',
      action: 'like',
    });
  });
  it('POST é upsert por usuário + anúncio', () => {
    expect(cfg.upsertOn).toBe('user_id,service_uid');
  });
  it('mapOutput converte a linha', () => {
    expect(
      cfg.mapOutput!({ uid: 'x', service_uid: 'u1', action: 'like', favorite: false, updated_at: 't' }),
    ).toEqual({
      uid: 'x',
      serviceUid: 'u1',
      liked: true,
      favorite: false,
      updatedAt: 't',
    });
  });
  it('lê pelo uid e exige login', () => {
    expect(cfg.primaryKey).toBe('uid');
    expect(cfg.table).toBe('service_user_favorites');
    expect(cfg.listRequiresAuth).not.toBe(false);
  });
});
