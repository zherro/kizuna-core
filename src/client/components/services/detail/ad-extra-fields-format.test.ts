import { describe, expect, it } from 'vitest';
import type { FormField, FormSchema } from '../../form-builder';
import {
  buildExtraFieldBlocks,
  formatDateTimeLabel,
  formatDayLabel,
  formatFieldValue,
  humanizeSlug,
  linkLabel,
} from './ad-extra-fields-format';

const NOW = new Date(2026, 9, 13);

function field(over: Partial<FormField> & Pick<FormField, 'key' | 'type'>): FormField {
  return {
    id: `id_${over.key}`,
    name: over.key,
    label: over.key,
    grid: {},
    behavior: {},
    validation: {},
    appearance: {},
    ...over,
  } as FormField;
}

describe('datas', () => {
  it('formata dia e hora pt-BR sem deslocar o fuso', () => {
    expect(formatDayLabel('2026-10-17', NOW)).toBe('sáb, 17 de out');
    expect(formatDateTimeLabel('2026-10-17T20:00', NOW)).toBe('sáb, 17 de out · 20:00');
    expect(formatDateTimeLabel('2026-10-17T00:30', NOW)).toBe('sáb, 17 de out · 00:30');
  });
  it('inclui o ano quando difere do atual', () => {
    expect(formatDayLabel('2027-01-02', NOW)).toBe('sáb, 2 de jan de 2027');
  });
  it('inválido → null', () => {
    expect(formatDayLabel('abc', NOW)).toBeNull();
    expect(formatDayLabel('2026-13-40', NOW)).toBeNull();
  });
});

describe('formatFieldValue', () => {
  it('omite vazio e false; true vira Sim', () => {
    expect(formatFieldValue({ type: 'text' }, '')).toBeNull();
    expect(formatFieldValue({ type: 'text' }, null)).toBeNull();
    expect(formatFieldValue({ type: 'switch' }, false)).toBeNull();
    expect(formatFieldValue({ type: 'switch' }, true)).toEqual({ text: 'Sim' });
  });
  it('moeda em BRL e 0 como Gratuito', () => {
    expect(formatFieldValue({ type: 'currency' }, 80)?.text.replace(/\s/g, ' ')).toBe('R$ 80,00');
    expect(formatFieldValue({ type: 'currency' }, 0)?.text).toBe('Gratuito');
  });
  it('usa o label da opção', () => {
    const f = { type: 'select' as const, options: [{ label: 'Meia-entrada', value: 'meia' }] };
    expect(formatFieldValue(f, 'meia')?.text).toBe('Meia-entrada');
    expect(formatFieldValue({ ...f, type: 'multiselect' }, ['meia', 'x'])?.text).toBe('Meia-entrada, x');
  });
  it('links: só http(s) viram link', () => {
    expect(formatFieldValue({ type: 'url' }, 'https://www.exemplo.com.br/a/')).toMatchObject({
      text: 'exemplo.com.br/a',
      href: 'https://www.exemplo.com.br/a/',
      external: true,
    });
    expect(formatFieldValue({ type: 'url' }, 'javascript:alert(1)')).toBeNull();
    expect(formatFieldValue({ type: 'text' }, 'http://x.com')?.href).toBe('http://x.com/');
  });
  it('telefone e e-mail viram tel:/mailto:', () => {
    expect(formatFieldValue({ type: 'phone' }, '(65) 9999-0000')?.href).toBe('tel:6599990000');
    expect(formatFieldValue({ type: 'email' }, 'a@b.com')?.href).toBe('mailto:a@b.com');
  });
  it('texto com ISO cru é formatado e slug é humanizado', () => {
    expect(formatFieldValue({ type: 'text' }, '2026-10-17T20:00', NOW)?.text).toBe('sáb, 17 de out · 20:00');
    expect(formatFieldValue({ type: 'text' }, 'cine-teatro-cuiaba')?.text).toBe('Cine Teatro Cuiaba');
  });
  it('remove a seta de CTA do fim ("Comprar ❯")', () => {
    expect(formatFieldValue({ type: 'text' }, 'Comprar ❯')?.text).toBe('Comprar');
  });
});

describe('helpers', () => {
  it('humanizeSlug só mexe em slug com 2+ hifens', () => {
    expect(humanizeSlug('wi-fi')).toBe('wi-fi');
    expect(humanizeSlug('Casa de Festas')).toBe('Casa de Festas');
  });
  it('linkLabel', () => {
    expect(linkLabel('https://www.x.com/')).toBe('x.com');
  });
});

describe('buildExtraFieldBlocks', () => {
  const schema: FormSchema = {
    title: 't',
    fields: [
      field({ key: 'secao', type: 'heading', label: 'Evento' }),
      field({ key: 'data_inicio', type: 'datetime', label: 'Início' }),
      field({ key: 'data_fim', type: 'datetime', label: 'Término' }),
      field({ key: 'realizador', type: 'text', label: 'Realizador' }),
      field({
        key: 'classificacao',
        type: 'select',
        label: 'Classificação',
        options: [{ label: '18 anos', value: '18' }],
      }),
      field({
        key: 'artistas',
        type: 'list',
        label: 'Atrações',
        itemFields: [field({ key: 'nome', type: 'text', label: 'Nome' })],
      }),
      field({
        key: 'sessoes',
        type: 'list',
        label: 'Sessões',
        itemFields: [
          field({ key: 'data', type: 'date', label: 'Data' }),
          field({ key: 'abertura', type: 'time', label: 'Portões' }),
          field({ key: 'inicio', type: 'time', label: 'Início' }),
          field({ key: 'fim', type: 'time', label: 'Término' }),
        ],
      }),
      field({
        key: 'ingressos',
        type: 'list',
        label: 'Ingressos',
        itemFields: [
          field({ key: 'titulo', type: 'text', label: 'Título' }),
          field({ key: 'setor', type: 'text', label: 'Setor' }),
          field({ key: 'tipo', type: 'select', label: 'Tipo', options: [{ label: 'Meia', value: 'meia' }] }),
          field({ key: 'valor', type: 'currency', label: 'Valor' }),
          field({ key: 'comprar', type: 'text', label: 'Comprar' }),
        ],
      }),
      field({ key: 'secao_vazia', type: 'heading', label: 'Vazia' }),
      field({ key: 'oculto', type: 'text', label: 'Oculto', behavior: { hidden: true } }),
    ],
  };

  const answers = {
    data_inicio: '2026-10-17T20:00',
    data_fim: '',
    realizador: 'Casa de Festas',
    classificacao: '18',
    oculto: 'x',
    artistas: [{ nome: 'Banda A' }, { nome: 'Banda B' }],
    sessoes: [{ data: '2026-10-17', abertura: '19:00', inicio: '20:00', fim: '22:00' }],
    ingressos: [{ titulo: 'Pista', setor: 'PLATEIA', tipo: 'meia', valor: 80, comprar: 'Comprar ❯' }],
  };

  const blocks = buildExtraFieldBlocks(schema, answers, NOW);

  it('mantém a ordem do schema, sem campos vazios/ocultos nem cabeçalho sem conteúdo', () => {
    expect(blocks.map((b) => b.kind)).toEqual(['fields', 'chips', 'entries', 'entries']);
    const fields = blocks[0];
    if (fields.kind !== 'fields') throw new Error('esperava fields');
    expect(fields.items.map((i) => [i.label, i.value.text])).toEqual([
      ['Início', 'sáb, 17 de out · 20:00'],
      ['Realizador', 'Casa de Festas'],
      ['Classificação', '18 anos'],
    ]);
  });

  it('lista de um campo só vira fichas', () => {
    const chips = blocks[1];
    expect(chips.kind === 'chips' && chips.items).toEqual(['Banda A', 'Banda B']);
  });

  it('sessão: dia na linha principal e horários rotulados', () => {
    const b = blocks[2];
    if (b.kind !== 'entries') throw new Error('esperava entries');
    expect(b.entries[0].lead).toBe('sáb, 17 de out');
    expect(b.entries[0].facts.map((f) => `${f.label} ${f.value.text}`)).toEqual([
      'Portões 19:00',
      'Início 20:00',
      'Término 22:00',
    ]);
  });

  it('ingresso: título, valor à direita, meta sem rótulo e sem o "Comprar"', () => {
    const b = blocks[3];
    if (b.kind !== 'entries') throw new Error('esperava entries');
    const e = b.entries[0];
    expect(e.lead).toBe('Pista');
    expect(e.amount?.replace(/\s/g, ' ')).toBe('R$ 80,00');
    expect(e.meta).toEqual(['PLATEIA', 'Meia']);
    expect(e.facts).toEqual([]);
  });

  it('sem respostas → nenhum bloco', () => {
    expect(buildExtraFieldBlocks(schema, {}, NOW)).toEqual([]);
  });
});

describe('ordem das sessões', () => {
  it('ordena itens com campo de data cronologicamente', () => {
    const schema: FormSchema = {
      title: 't',
      fields: [
        field({
          key: 'sessoes',
          type: 'list',
          label: 'Sessões',
          itemFields: [field({ key: 'data', type: 'date', label: 'Data' }), field({ key: 'inicio', type: 'time', label: 'Início' })],
        }),
      ],
    };
    const blocks = buildExtraFieldBlocks(
      schema,
      { sessoes: [{ data: '2026-10-18', inicio: '19:00' }, { data: '2026-10-17', inicio: '20:00' }] },
      NOW
    );
    const b = blocks[0];
    if (b.kind !== 'entries') throw new Error('esperava entries');
    expect(b.entries.map((e) => e.lead)).toEqual(['sáb, 17 de out', 'dom, 18 de out']);
  });
});
