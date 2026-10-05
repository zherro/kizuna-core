import { describe, it, expect } from 'vitest';
import { resourceServiceReactions, rpcSwipe } from './swipe';

const cfg = resourceServiceReactions.service_reactions;

describe('service_reactions', () => {
  it('mapOutput converte a linha (kind + active)', () => {
    expect(
      cfg.mapOutput!({
        uid: 'x',
        service_uid: 'u1',
        kind: 'favorite',
        active: true,
        created_at: 'c',
        updated_at: 'u',
      }),
    ).toEqual({ uid: 'x', serviceUid: 'u1', kind: 'favorite', active: true, createdAt: 'c', updatedAt: 'u' });
  });
  it('lê pelo uid e exige login', () => {
    expect(cfg.primaryKey).toBe('uid');
    expect(cfg.table).toBe('service_user_favorites');
    expect(cfg.listRequiresAuth).not.toBe(false);
  });
});

describe('rpcSwipe', () => {
  it('estado é público com sessão opcional; gravar exige login', () => {
    expect(rpcSwipe.fn_service_reaction_state).toMatchObject({ requiresAuth: false, optionalAuth: true });
    expect(rpcSwipe.fn_service_react.requiresAuth).not.toBe(false);
  });
});
