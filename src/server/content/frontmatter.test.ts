import { describe, it, expect } from 'vitest';
import { parseFrontmatter, FrontmatterError } from './frontmatter';

describe('parseFrontmatter', () => {
  it('lê pares chave: valor e devolve o corpo', () => {
    const doc = parseFrontmatter('---\ntitulo: Lua Morena\ncidade: cuiaba-mt\n---\n\nTexto aqui.\n');
    expect(doc.data).toEqual({ titulo: 'Lua Morena', cidade: 'cuiaba-mt' });
    expect(doc.body).toBe('Texto aqui.\n');
  });

  it('sem frontmatter devolve data vazio e o texto inteiro', () => {
    const doc = parseFrontmatter('Só texto.\n');
    expect(doc.data).toEqual({});
    expect(doc.body).toBe('Só texto.\n');
  });

  it('aceita aspas duplas com escape e aspas simples', () => {
    const doc = parseFrontmatter(
      '---\na: "ele disse \\"oi\\""\nb: \'it\'\'s\'\nc: "x: y"\n---\n'
    );
    expect(doc.data).toEqual({ a: 'ele disse "oi"', b: "it's", c: 'x: y' });
  });

  it('mantém dois-pontos e # dentro de valor sem aspas quando # não vem após espaço', () => {
    const doc = parseFrontmatter(
      '---\nendereco: Av. do CPA, 100: sala 2\nsite: https://x.com/#topo\n---\n'
    );
    expect(doc.data.endereco).toBe('Av. do CPA, 100: sala 2');
    expect(doc.data.site).toBe('https://x.com/#topo');
  });

  it('ignora comentário de linha e comentário no fim do valor', () => {
    const doc = parseFrontmatter('---\n# nota\nstatus: rascunho # ainda não\n---\n');
    expect(doc.data).toEqual({ status: 'rascunho' });
  });

  it('aceita lista com hífen', () => {
    const doc = parseFrontmatter('---\nhorario:\n  - "Qui a sáb, 22h às 5h"\n  - Dom, fechado\ntitulo: X\n---\n');
    expect(doc.data.horario).toEqual(['Qui a sáb, 22h às 5h', 'Dom, fechado']);
    expect(doc.data.titulo).toBe('X');
  });

  it('chave sem valor e sem itens vira string vazia', () => {
    expect(parseFrontmatter('---\ncreditos:\n---\n').data.creditos).toBe('');
  });

  it('aceita @handle como texto simples', () => {
    expect(parseFrontmatter('---\ninstagram: @luamorena\n---\n').data.instagram).toBe('@luamorena');
  });

  it('CRLF e BOM (arquivo salvo no Windows) parseiam igual', () => {
    const doc = parseFrontmatter('﻿---\r\ntitulo: Lua\r\nhorario:\r\n  - a\r\n---\r\n\r\nCorpo\r\n');
    expect(doc.data).toEqual({ titulo: 'Lua', horario: ['a'] });
    expect(doc.body).toBe('Corpo\n');
  });

  it('erro com número da linha para objeto aninhado', () => {
    try {
      parseFrontmatter('---\ntitulo: X\nimagem:\n  arquivo: a.jpg\n---\n');
      throw new Error('deveria lançar');
    } catch (e) {
      expect(e).toBeInstanceOf(FrontmatterError);
      expect((e as FrontmatterError).line).toBe(4);
      expect((e as Error).message).toMatch(/recuo não suportado/);
    }
  });

  it('erro para multilinha, coleção inline e âncora', () => {
    expect(() => parseFrontmatter('---\nresumo: |\n---\n')).toThrow(/sintaxe não suportada/);
    expect(() => parseFrontmatter('---\nresumo: [a, b]\n---\n')).toThrow(/sintaxe não suportada/);
    expect(() => parseFrontmatter('---\nresumo: &a x\n---\n')).toThrow(/sintaxe não suportada/);
  });

  it('erro para chave repetida, aspas sem fechar e frontmatter sem fechamento', () => {
    expect(() => parseFrontmatter('---\na: 1\na: 2\n---\n')).toThrow(/repetida/);
    expect(() => parseFrontmatter('---\na: "aberta\n---\n')).toThrow(/sem fechamento/);
    expect(() => parseFrontmatter('---\na: 1\n')).toThrow(/fechamento/);
  });

  it('chave __proto__ não polui o objeto', () => {
    const doc = parseFrontmatter('---\n__proto__: x\n---\n');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(doc.data.__proto__).toBe('x');
  });

  it('chave com comentário logo após os dois-pontos vira valor vazio', () => {
    expect(parseFrontmatter('---\ntitulo: # só comentário\n---\n').data.titulo).toBe('');
  });

  it('chave com comentário seguida de itens de lista aceita a lista', () => {
    const doc = parseFrontmatter('---\nhorario: # um por linha\n  - a\n  - b\n---\n');
    expect(doc.data.horario).toEqual(['a', 'b']);
  });

  it('item de lista que é só comentário vira string vazia', () => {
    const doc = parseFrontmatter('---\nhorario:\n  - # nota\n  - b\n---\n');
    expect(doc.data.horario).toEqual(['', 'b']);
  });

  it('escape desconhecido em aspas duplas lança erro em vez de decodificar em silêncio', () => {
    expect(() => parseFrontmatter('---\na: "\\u00e9"\n---\n')).toThrow(/não suportado/);
    expect(() => parseFrontmatter('---\na: "\\x41"\n---\n')).toThrow(/não suportado/);
  });

  it('aceita fim de linha só com CR (sem LF)', () => {
    const doc = parseFrontmatter('---\rtitulo: X\r---\rCorpo\r');
    expect(doc.data).toEqual({ titulo: 'X' });
    expect(doc.body).toBe('Corpo\n');
  });
});
