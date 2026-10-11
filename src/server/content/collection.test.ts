import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineCollection, loadEntries, getEntry, isValidSlug } from './collection';

const COLLECTION = defineCollection({
  name: 'teste',
  contentDir: 'content/t',
  mediaDir: 'public/t',
  mediaUrl: '/t',
  fields: {
    titulo: { type: 'string', required: true, max: 20 },
    status: { type: 'enum', values: ['rascunho', 'aprovado'], required: true },
    quando: { type: 'date' },
    lat: { type: 'number', min: -90, max: 90 },
    lng: { type: 'number', min: -180, max: 180 },
    horario: { type: 'list' },
    site: { type: 'string', url: true },
  },
  publishWhen: { field: 'status', equals: 'aprovado' },
  validate: (d) => ((d.lat === undefined) !== (d.lng === undefined) ? 'lat e lng devem vir juntas' : null),
});

let root: string;
function put(rel: string, content = 'x') {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function entry(slug: string, front: string, body = 'Corpo.') {
  put(`content/t/${slug}/index.md`, `---\n${front}\n---\n\n${body}\n`);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'kz-content-'));
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('defineCollection', () => {
  it('exige que publishWhen aponte para um campo enum com o valor', () => {
    const base = { name: 'x', contentDir: 'c', mediaDir: 'm', mediaUrl: '/m' };
    expect(() =>
      defineCollection({ ...base, fields: { s: { type: 'string' } }, publishWhen: { field: 's', equals: 'a' } })
    ).toThrow(/enum/);
    expect(() =>
      defineCollection({
        ...base,
        fields: { s: { type: 'enum', values: ['a'] } },
        publishWhen: { field: 's', equals: 'b' },
      })
    ).toThrow(/values/);
  });
});

describe('loadEntries', () => {
  it('carrega entrada publicada, com fotos em ordem natural e extensão maiúscula', () => {
    entry('lua-morena', 'titulo: Lua Morena\nstatus: aprovado\nhorario:\n  - a\n  - b');
    for (const f of ['10.JPG', '2.jpg', '1.png', 'nota.txt']) put(`public/t/lua-morena/${f}`);
    const { entries, errors } = loadEntries(COLLECTION, { root });
    expect(errors).toEqual([]);
    expect(entries).toHaveLength(1);
    expect(entries[0].slug).toBe('lua-morena');
    expect(entries[0].data.titulo).toBe('Lua Morena');
    expect(entries[0].data.horario).toEqual(['a', 'b']);
    expect(entries[0].body).toBe('Corpo.\n');
    expect(entries[0].media).toEqual(['/t/lua-morena/1.png', '/t/lua-morena/2.jpg', '/t/lua-morena/10.JPG']);
  });

  it('rascunho fica fora de entries e não gera erro', () => {
    entry('a', 'titulo: A\nstatus: rascunho');
    expect(loadEntries(COLLECTION, { root })).toEqual({ entries: [], errors: [] });
  });

  it('pasta sem fotos devolve media vazio', () => {
    entry('a', 'titulo: A\nstatus: aprovado');
    expect(loadEntries(COLLECTION, { root }).entries[0].media).toEqual([]);
  });

  it('diretório de conteúdo inexistente devolve vazio sem lançar', () => {
    expect(loadEntries(COLLECTION, { root })).toEqual({ entries: [], errors: [] });
  });

  it('campo obrigatório ausente vira erro com o caminho do arquivo', () => {
    entry('a', 'status: aprovado');
    const { entries, errors } = loadEntries(COLLECTION, { root });
    expect(entries).toEqual([]);
    expect(errors[0].slug).toBe('a');
    expect(errors[0].file).toContain(path.join('content', 't', 'a', 'index.md'));
    expect(errors[0].message).toMatch(/campo obrigatório ausente: "titulo"/);
  });

  it('valida max, enum, data, campo desconhecido e url', () => {
    entry('max', 'titulo: "um título muito mais comprido que vinte"\nstatus: aprovado');
    entry('enum', 'titulo: A\nstatus: publicado');
    entry('data', 'titulo: A\nstatus: aprovado\nquando: 2026-02-30');
    entry('desc', 'titulo: A\nstatus: aprovado\ncor: azul');
    entry('url', 'titulo: A\nstatus: aprovado\nsite: javascript:alert(1)');
    const msgs = Object.fromEntries(loadEntries(COLLECTION, { root }).errors.map((e) => [e.slug, e.message]));
    expect(msgs.max).toMatch(/máximo é 20/);
    expect(msgs.enum).toMatch(/deve ser um de: rascunho, aprovado/);
    expect(msgs.data).toMatch(/AAAA-MM-DD/);
    expect(msgs.desc).toMatch(/campo desconhecido "cor"/);
    expect(msgs.url).toMatch(/http ou https/);
  });

  it('latitude com vírgula decimal dá erro claro, não NaN', () => {
    entry('a', 'titulo: A\nstatus: aprovado\nlat: "-15,6"\nlng: -56.1');
    const { errors } = loadEntries(COLLECTION, { root });
    expect(errors[0].message).toMatch(/vírgula decimal.*ponto/);
  });

  it('numero fora da faixa e validate cruzado', () => {
    entry('faixa', 'titulo: A\nstatus: aprovado\nlat: 91\nlng: 0');
    entry('par', 'titulo: B\nstatus: aprovado\nlat: -15.6');
    const msgs = Object.fromEntries(loadEntries(COLLECTION, { root }).errors.map((e) => [e.slug, e.message]));
    expect(msgs.faixa).toMatch(/lat.*90/);
    expect(msgs.par).toMatch(/lat e lng devem vir juntas/);
  });

  it('converte número e mantém data como texto', () => {
    entry('a', 'titulo: A\nstatus: aprovado\nlat: -15.601\nlng: -56.097\nquando: 2026-10-03');
    const e = loadEntries(COLLECTION, { root }).entries[0];
    expect(e.data.lat).toBe(-15.601);
    expect(e.data.quando).toBe('2026-10-03');
  });

  it('nome de pasta inválido é erro; pasta com _ ou . é ignorada', () => {
    put('content/t/Casa Noturna/index.md');
    put('content/t/_modelo/index.md');
    put('content/t/.git/x');
    const { errors } = loadEntries(COLLECTION, { root });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/nome de pasta inválido/);
  });

  it('frontmatter fora do subconjunto vira erro com a linha', () => {
    entry('a', 'titulo: A\nstatus: aprovado\nimagem:\n  arquivo: x.jpg');
    expect(loadEntries(COLLECTION, { root }).errors[0].message).toMatch(/linha 5.*recuo/);
  });

  it('ordena entries por slug', () => {
    entry('zeta', 'titulo: Z\nstatus: aprovado');
    entry('alfa', 'titulo: A\nstatus: aprovado');
    expect(loadEntries(COLLECTION, { root }).entries.map((e) => e.slug)).toEqual(['alfa', 'zeta']);
  });
});

describe('getEntry', () => {
  it('devolve a entrada publicada', () => {
    entry('a', 'titulo: A\nstatus: aprovado');
    expect(getEntry(COLLECTION, 'a', { root })?.data.titulo).toBe('A');
  });

  it('devolve null para rascunho, inexistente e inválida', () => {
    entry('rasc', 'titulo: A\nstatus: rascunho');
    expect(getEntry(COLLECTION, 'rasc', { root })).toBeNull();
    expect(getEntry(COLLECTION, 'nao-existe', { root })).toBeNull();
  });

  it('entrada inválida: null e avisa uma vez', () => {
    entry('ruim', 'titulo: A\nstatus: invalido');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(getEntry(COLLECTION, 'ruim', { root })).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('entrada inexistente: null e não avisa', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(getEntry(COLLECTION, 'nao-existe', { root })).toBeNull();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('erro de leitura que não é "inexistente" (index.md é pasta): null e avisa com o motivo real', () => {
    fs.mkdirSync(path.join(root, 'content/t/pasta/index.md'), { recursive: true });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(getEntry(COLLECTION, 'pasta', { root })).toBeNull();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toMatch(/não foi possível ler index\.md: \w+/);
    } finally {
      warn.mockRestore();
    }
  });

  it('slug com travessia de diretório nunca lê fora da coleção', () => {
    put('segredo/index.md', '---\ntitulo: X\nstatus: aprovado\n---\n');
    for (const slug of ['../../segredo', '..', 'a/b', 'a\\b', '%2e%2e', '..%2f..%2fsegredo', '']) {
      expect(getEntry(COLLECTION, slug, { root })).toBeNull();
    }
  });
});

describe('isValidSlug', () => {
  it('aceita a-z, 0-9 e hífen simples', () => {
    expect(isValidSlug('lua-morena')).toBe(true);
    expect(isValidSlug('shopping-3')).toBe(true);
    for (const bad of ['Lua', 'a_b', '-a', 'a-', 'a--b', 'a b', '']) expect(isValidSlug(bad)).toBe(false);
  });
});
