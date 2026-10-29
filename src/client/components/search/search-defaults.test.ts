import { describe, expect, it } from 'vitest';
import { ALL_GROUPS_PARAM, normalizeOrder, orderForGroup, resolveGroupParam } from './use-search-filters';

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
  const cfg = { eventos: 'occurs_at:asc', default: 'created_at:desc' };

  it('usa a ordem do grupo, senão o default, senão relevância', () => {
    expect(orderForGroup(cfg, 'eventos')).toBe('occurs_at:asc');
    expect(orderForGroup(cfg, 'cinema')).toBe('created_at:desc');
    expect(orderForGroup(cfg, null)).toBe('created_at:desc');
    expect(orderForGroup(undefined, 'eventos')).toBe('relevance');
  });

  it('valor desconhecido vira relevância', () => {
    expect(orderForGroup({ eventos: 'xyz' }, 'eventos')).toBe('relevance');
  });
});

describe('normalizeOrder', () => {
  it('campo sem direção vira asc; apelidos da 0010 continuam', () => {
    expect(normalizeOrder('title')).toBe('title:asc');
    expect(normalizeOrder('PRICE:DESC')).toBe('price:desc');
    expect(normalizeOrder('event_start')).toBe('expires_at:asc');
    expect(normalizeOrder('recent')).toBe('created_at:desc');
  });

  it('campo fora da lista ou direção inválida vira relevância', () => {
    expect(normalizeOrder('answers.data_inicio')).toBe('relevance');
    expect(normalizeOrder('title:up')).toBe('relevance');
    expect(normalizeOrder(null)).toBe('relevance');
  });
});
