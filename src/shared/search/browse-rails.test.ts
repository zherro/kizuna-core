import { describe, expect, it } from 'vitest';
import type { ServiceResult } from '../../client/components/search/search-types';
import {
  buildRail,
  interleave,
  isInitialRailsUsable,
  normalizeBrowseRails,
  normalizeOrder,
  orderForGroup,
  type BrowseRailsData,
} from './browse-rails';

const item = (uid: string) => ({ uid }) as ServiceResult;

describe('normalizeOrder / orderForGroup', () => {
  it('apelido, campo:dir e inválido', () => {
    expect(normalizeOrder('event_start')).toBe('expires_at:asc');
    expect(normalizeOrder('price:desc')).toBe('price:desc');
    expect(normalizeOrder('xyz')).toBe('relevance');
    expect(normalizeOrder(null)).toBe('relevance');
  });

  it('grupo, depois default, depois relevância', () => {
    const cfg = { eventos: 'event_start', default: 'recent' };
    expect(orderForGroup(cfg, 'eventos')).toBe('expires_at:asc');
    expect(orderForGroup(cfg, 'lugares')).toBe('created_at:desc');
    expect(orderForGroup(undefined, 'x')).toBe('relevance');
  });
});

describe('normalizeBrowseRails / interleave / buildRail', () => {
  it('normaliza strings e objetos', () => {
    expect(normalizeBrowseRails(['a', { groups: [' b ', ''], title: ' T ' }, { groups: [] }])).toEqual([
      { groups: ['a'] },
      { groups: ['b'], title: 'T' },
    ]);
  });

  it('alterna sem repetir e respeita o limite', () => {
    expect(interleave([[item('a'), item('b')], [item('x'), item('a')]], 3).map((i) => i.uid)).toEqual([
      'a',
      'x',
      'b',
    ]);
  });

  it('hasMore quando algum grupo enche a página', () => {
    const full = Array.from({ length: 12 }, (_, i) => item(`u${i}`));
    expect(buildRail({ groups: ['a'] }, [full]).hasMore).toBe(true);
    expect(buildRail({ groups: ['a'] }, [[item('1')]]).hasMore).toBe(false);
  });
});

describe('isInitialRailsUsable', () => {
  const rails = [{ groups: ['eventos'] }];
  const initial: BrowseRailsData = {
    cityIbge: '5103403',
    signature: JSON.stringify(rails),
    rails: [],
    groupNames: {},
  };

  it('cidade igual (string ou número) vale', () => {
    expect(isInitialRailsUsable(initial, rails, '5103403')).toBe(true);
    expect(isInitialRailsUsable(initial, rails, 5103403)).toBe(true);
  });
  it('cidade ainda desconhecida vale', () => {
    expect(isInitialRailsUsable(initial, rails, null)).toBe(true);
    expect(isInitialRailsUsable(initial, rails, undefined)).toBe(true);
  });
  it('cidade diferente não vale', () => {
    expect(isInitialRailsUsable(initial, rails, '5108402')).toBe(false);
  });
  it('assinatura diferente ou sem inicial não vale', () => {
    expect(isInitialRailsUsable(initial, [{ groups: ['cinema'] }], '5103403')).toBe(false);
    expect(isInitialRailsUsable(undefined, rails, null)).toBe(false);
  });
});
