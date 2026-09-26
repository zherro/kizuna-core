import { describe, it, expect } from 'vitest';
import {
  collectKeyIssues,
  createField,
  resolveItemFields,
  type FormField,
  type FormSchema,
} from './types';
import { collectOutput, validate } from './validate';
import { groupFieldsIntoSteps } from './step-grouping';

function f(partial: Partial<FormField> & Pick<FormField, 'key' | 'type'>): FormField {
  return {
    id: partial.key,
    name: partial.key,
    label: partial.key,
    grid: {},
    behavior: {},
    validation: {},
    appearance: {},
    ...partial,
  };
}

const sessoes = (over: Partial<FormField> = {}): FormField =>
  f({
    key: 'sessoes',
    type: 'list',
    itemLabel: 'Sessão',
    itemFields: [
      f({ key: 'data', type: 'date', behavior: { required: true } }),
      f({ key: 'preco', type: 'currency', validation: { min: 0, max: 500 } }),
      f({ key: 'url_compra', type: 'url', validation: { regex: '^https://' } }),
      f({ key: 'nota', type: 'text', validation: { maxLength: 5 } }),
    ],
    ...over,
  });

const schema = (field: FormField): FormSchema => ({ title: 't', fields: [field] });

describe('types: list', () => {
  it('createField(list) starts with empty itemFields', () => {
    const l = createField('list');
    expect(l.type).toBe('list');
    expect(l.itemFields).toEqual([]);
  });

  it('resolveItemFields drops disallowed types and defaults missing props', () => {
    const l = f({
      key: 'l',
      type: 'list',
      itemFields: [
        { key: 'a', type: 'text' } as FormField,
        f({ key: 'b', type: 'list' }),
        f({ key: 'c', type: 'upload' }),
        f({ key: 'd', type: 'heading' }),
      ],
    });
    const subs = resolveItemFields(l);
    expect(subs.map((s) => s.key)).toEqual(['a']);
    expect(subs[0].behavior).toEqual({});
    expect(subs[0].id).toBeTruthy();
  });

  it('collectKeyIssues flags duplicate/invalid/forbidden sub-field keys', () => {
    const l = f({
      key: 'l',
      type: 'list',
      itemFields: [
        f({ key: 'a', type: 'text', id: 's1' }),
        f({ key: 'a', type: 'text', id: 's2' }),
        f({ key: 'Bad Key', type: 'text', id: 's3' }),
        f({ key: 'x', type: 'list', id: 's4' }),
      ],
    });
    const issues = collectKeyIssues(schema(l));
    expect(issues.s1).toMatch(/duplicada/);
    expect(issues.s2).toMatch(/duplicada/);
    expect(issues.s3).toMatch(/inválida/);
    expect(issues.s4).toMatch(/não é permitido/);
    expect(issues.l).toBeTruthy();
  });

  it('the same sub key in two different lists is fine', () => {
    const a = f({ key: 'a', type: 'list', itemFields: [f({ key: 'x', type: 'text', id: 'a_x' })] });
    const b = f({ key: 'b', type: 'list', itemFields: [f({ key: 'x', type: 'text', id: 'b_x' })] });
    expect(collectKeyIssues({ title: 't', fields: [a, b] })).toEqual({});
  });
});

describe('collectOutput: list', () => {
  it('returns array with only sub-field keys, omitting null/empty cells', () => {
    const out = collectOutput(schema(sessoes()), {
      sessoes: [
        { data: '2026-10-01', preco: 40, url_compra: '', extra: 'lixo', nota: null },
        { data: '2026-10-02' },
      ],
    });
    expect(out).toEqual({
      sessoes: [{ data: '2026-10-01', preco: 40 }, { data: '2026-10-02' }],
    });
  });

  it('drops fully blank rows (including a lone false switch)', () => {
    const l = f({
      key: 'l',
      type: 'list',
      itemFields: [f({ key: 'a', type: 'text' }), f({ key: 'b', type: 'switch' })],
    });
    const out = collectOutput(schema(l), { l: [{}, { a: '  ', b: false }, { a: 'x', b: false }] });
    expect(out).toEqual({ l: [{ a: 'x', b: false }] });
  });

  it('omits hidden sub-fields and keeps an empty array', () => {
    const l = f({
      key: 'l',
      type: 'list',
      itemFields: [f({ key: 'a', type: 'text' }), f({ key: 'h', type: 'text', behavior: { hidden: true } })],
    });
    expect(collectOutput(schema(l), { l: [{ a: 'x', h: 'y' }] })).toEqual({ l: [{ a: 'x' }] });
    expect(collectOutput(schema(l), { l: [] })).toEqual({ l: [] });
  });

  it('respects root-level visibleWhen', () => {
    const l = sessoes({ visibleWhen: { field: 'show', op: 'truthy' } });
    const s: FormSchema = { title: 't', fields: [f({ key: 'show', type: 'switch' }), l] };
    expect(collectOutput(s, { show: false, sessoes: [{ data: 'x' }] })).toEqual({ show: false });
  });
});

describe('validate: list', () => {
  it('required list needs at least one non-blank item', () => {
    const s = schema(sessoes({ behavior: { required: true } }));
    expect(validate(s, {}).sessoes).toBe('Adicione ao menos um item.');
    expect(validate(s, { sessoes: [{}] }).sessoes).toBeTruthy();
    expect(validate(s, { sessoes: [{ data: '2026-10-01' }] })).toEqual({});
  });

  it('non-required empty list is valid', () => {
    expect(validate(schema(sessoes()), { sessoes: [] })).toEqual({});
    expect(validate(schema(sessoes()), {})).toEqual({});
  });

  it('enforces minItems and maxItems', () => {
    const s = schema(sessoes({ minItems: 2, maxItems: 2 }));
    expect(validate(s, { sessoes: [{ data: 'a' }] }).sessoes).toBe('Mínimo de 2 itens.');
    expect(validate(s, { sessoes: [{ data: 'a' }, { data: 'b' }] })).toEqual({});
    expect(validate(s, { sessoes: [{ data: 'a' }, { data: 'b' }, { data: 'c' }] }).sessoes).toBe(
      'Máximo de 2 itens.'
    );
  });

  it('uses a default max of 200 items', () => {
    const rows = Array.from({ length: 201 }, () => ({ data: 'x' }));
    expect(validate(schema(sessoes()), { sessoes: rows }).sessoes).toBe('Máximo de 200 itens.');
  });

  it('reports sub-field errors by path campo[index].sub', () => {
    const errors = validate(schema(sessoes()), {
      sessoes: [
        { data: '2026-10-01', preco: 10 },
        { preco: 900, url_compra: 'http://x', nota: 'longo demais' },
      ],
    });
    expect(errors).toEqual({
      'sessoes[1].data': 'Campo obrigatório.',
      'sessoes[1].preco': 'Valor máximo: 500.',
      'sessoes[1].url_compra': 'Formato inválido.',
      'sessoes[1].nota': 'Máximo de 5 caracteres.',
    });
  });

  it('skips blank rows when validating cells', () => {
    expect(validate(schema(sessoes()), { sessoes: [{}, { data: 'x' }] })).toEqual({});
  });

  it('root fields keep their flat error keys', () => {
    const s: FormSchema = {
      title: 't',
      fields: [f({ key: 'nome', type: 'text', behavior: { required: true } })],
    };
    expect(validate(s, {})).toEqual({ nome: 'Campo obrigatório.' });
  });
});

describe('step-grouping: list', () => {
  it('a list gets its own step and closes the compact bundle', () => {
    const opts = [{ label: 'a', value: 'a' }];
    const r1 = f({ key: 'r1', type: 'radio', options: opts });
    const l = sessoes();
    const r2 = f({ key: 'r2', type: 'radio', options: opts });
    expect(groupFieldsIntoSteps([r1, l, r2])).toEqual([[r1], [l], [r2]]);
  });
});
