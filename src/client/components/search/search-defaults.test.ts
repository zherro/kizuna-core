import { describe, expect, it } from 'vitest';
import { ALL_GROUPS_PARAM, orderForGroup, resolveGroupParam } from './use-search-filters';

const qs = (s: string) => new URLSearchParams(s);

describe('resolveGroupParam', () => {
  it('sem grupo padrão segue a URL', () => {
    expect(resolveGroupParam(qs(''), null)).toBeNull();
    expect(resolveGroupParam(qs('group=cinema'), null)).toBe('cinema');
  });

  it('URL vazia cai no grupo padrão; grupo explícito vence', () => {
    expect(resolveGroupParam(qs(''), 'eventos')).toBe('eventos');
    expect(resolveGroupParam(qs('group=cinema'), 'eventos')).toBe('cinema');
  });

  it('"todos" mostra tudo mesmo com grupo padrão', () => {
    expect(resolveGroupParam(qs(`group=${ALL_GROUPS_PARAM}`), 'eventos')).toBeNull();
  });

  it('categoria ou texto na URL não prendem ao grupo padrão', () => {
    expect(resolveGroupParam(qs('categoryIds=3'), 'eventos')).toBeNull();
    expect(resolveGroupParam(qs('q=pizza'), 'eventos')).toBeNull();
  });
});

describe('orderForGroup', () => {
  const cfg = { eventos: 'event_start', default: 'recent' };

  it('usa a ordem do grupo, senão o default, senão relevância', () => {
    expect(orderForGroup(cfg, 'eventos')).toBe('event_start');
    expect(orderForGroup(cfg, 'cinema')).toBe('recent');
    expect(orderForGroup(cfg, null)).toBe('recent');
    expect(orderForGroup(undefined, 'eventos')).toBe('relevance');
  });

  it('valor desconhecido vira relevância', () => {
    expect(orderForGroup({ eventos: 'xyz' }, 'eventos')).toBe('relevance');
  });
});
