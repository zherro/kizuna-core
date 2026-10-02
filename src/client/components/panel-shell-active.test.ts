import { describe, expect, it } from 'vitest';
import { activeNavHref } from './panel-shell-active';

const HREFS = ['/painel', '/painel/meus-servicos/novo', '/painel/meus-servicos', '/painel/agenda'];

describe('activeNavHref', () => {
  it('rota de um item filho: só o mais específico fica ativo ("Novo", não "Ver todos")', () => {
    expect(activeNavHref('/painel/meus-servicos/novo', HREFS)).toBe('/painel/meus-servicos/novo');
  });

  it('subrota sem item próprio continua acendendo o pai ("Ver todos" ao editar)', () => {
    expect(activeNavHref('/painel/meus-servicos/123', HREFS)).toBe('/painel/meus-servicos');
    expect(activeNavHref('/painel/meus-servicos', HREFS)).toBe('/painel/meus-servicos');
  });

  it('casa por segmento, não por prefixo de texto', () => {
    expect(activeNavHref('/painel/agendamentos', HREFS)).toBeNull();
  });

  it('"/painel" só acende na rota exata', () => {
    expect(activeNavHref('/painel', HREFS)).toBe('/painel');
    expect(activeNavHref('/painel/outra-coisa', HREFS)).toBeNull();
  });
});
