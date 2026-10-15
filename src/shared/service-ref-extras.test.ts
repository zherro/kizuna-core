import { describe, expect, it } from 'vitest';
import { serviceRefExtras } from './service-ref-extras';

describe('serviceRefExtras', () => {
  it('sem extras: local_ref, pontos_de_venda e artistas vêm das respostas do formulário', () => {
    const out = serviceRefExtras(
      { extras: { tags: ['a'] } },
      { answers: { local_ref: 'lua-morena', pontos_de_venda: [{ nome: 'x' }], artistas: ['Y'], endereco: 'z' } }
    );
    expect(out).toEqual({ tags: ['a'], local_ref: 'lua-morena', pontos_de_venda: [{ nome: 'x' }], artistas: ['Y'] });
  });

  it('extras vence; vazio em extras cai no formulário', () => {
    const out = serviceRefExtras(
      { extras: { local_ref: 'casa', pontos_de_venda: [], artistas: '  ' } },
      { answers: { local_ref: 'outra', pontos_de_venda: [{ nome: 'p' }], artistas: ['A'] } }
    );
    expect(out.local_ref).toBe('casa');
    expect(out.pontos_de_venda).toEqual([{ nome: 'p' }]);
    expect(out.artistas).toEqual(['A']);
  });

  it('sem formulário devolve os extras como estão', () => {
    const extras = { local_ref: 'casa' };
    expect(serviceRefExtras({ extras }, null)).toEqual(extras);
    expect(serviceRefExtras({ extras: null }, undefined)).toEqual({});
  });
});
