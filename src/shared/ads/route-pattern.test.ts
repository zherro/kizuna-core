import { describe, expect, it } from 'vitest';
import { routePattern } from './route-pattern';

describe('routePattern', () => {
  it('raiz e rotas estáticas', () => {
    expect(routePattern('/')).toBe('/');
    expect(routePattern('/busca')).toBe('/busca');
    expect(routePattern('/descobrir')).toBe('/descobrir');
  });
  it('troca segmentos dinâmicos', () => {
    expect(routePattern('/anuncios/abc-123')).toBe('/anuncios/[id]');
    expect(routePattern('/cuiaba')).toBe('/[cidade]');
    expect(routePattern('/cuiaba/bares')).toBe('/[cidade]/[id]');
  });
  it('ignora query, hash e barra final', () => {
    expect(routePattern('/busca/?q=x#y')).toBe('/busca');
  });
});
