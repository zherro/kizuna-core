import { describe, expect, it } from 'vitest';
import {
  humanizeServiceTag,
  CODIGO_PATTERN,
  TAG_PATTERN,
  buildServiceLinksPatch,
  codigoCandidates,
  codigoOf,
  linkedRailTitle,
  parseTagsInput,
  serviceLinksOf,
  validateServiceLinks,
  normalizeServiceTag,
  normalizeServiceTags,
  orderTagsForRails,
  serviceTagRailTitle,
  serviceTagsOf,
} from './service-tags';

describe('normalizeServiceTags', () => {
  it('apara, põe em minúsculas, tira vazias, repetidas e não-strings', () => {
    expect(normalizeServiceTags([' Casas-de-Festas ', 'casas-de-festas', '', '  ', 3, null, 'LOCAL:X'])).toEqual([
      'casas-de-festas',
      'local:x',
    ]);
  });

  it('o que não é array vira []', () => {
    expect(normalizeServiceTags('shopping')).toEqual([]);
    expect(normalizeServiceTags(null)).toEqual([]);
    expect(normalizeServiceTags({ a: 1 })).toEqual([]);
  });

  it('normalizeServiceTag: só string não vazia', () => {
    expect(normalizeServiceTag('  A ')).toBe('a');
    expect(normalizeServiceTag(' ')).toBeNull();
    expect(normalizeServiceTag(1)).toBeNull();
  });
});

describe('serviceTagsOf', () => {
  it('lê extras.tags e tolera extras ausente/fora do formato', () => {
    expect(serviceTagsOf({ extras: { tags: ['Shopping'] } })).toEqual(['shopping']);
    expect(serviceTagsOf({ extras: { tags: 'shopping' } })).toEqual([]);
    expect(serviceTagsOf({ extras: null })).toEqual([]);
    expect(serviceTagsOf({})).toEqual([]);
    expect(serviceTagsOf(null)).toEqual([]);
  });
});

describe('títulos', () => {
  it('humaniza kebab e ignora prefixo', () => {
    expect(humanizeServiceTag('casas-de-festas')).toBe('Casas de festas');
    expect(humanizeServiceTag('regiao:centro-historico')).toBe('Centro historico');
    expect(humanizeServiceTag('')).toBe('');
  });

  it('local:* → "Neste local"; demais → "Mais em <tag>"', () => {
    expect(serviceTagRailTitle('local:espaco-art')).toBe('Neste local');
    expect(serviceTagRailTitle('shoppings')).toBe('Mais em Shoppings');
    expect(serviceTagRailTitle('')).toBe('Mais como este');
  });

  it('ordena tags de local primeiro, mantendo a ordem do resto', () => {
    expect(orderTagsForRails(['b', 'local:x', 'a', 'local:y'])).toEqual(['local:x', 'local:y', 'b', 'a']);
  });
});

describe('codigoOf / codigoCandidates', () => {
  it('codigoOf normaliza; ausente, vazio ou não-string → null', () => {
    expect(codigoOf({ extras: { codigo: ' Casa-X ' } })).toBe('casa-x');
    expect(codigoOf({ extras: {} })).toBeNull();
    expect(codigoOf({ extras: { codigo: '  ' } })).toBeNull();
    expect(codigoOf({ extras: { codigo: 3 } })).toBeNull();
    expect(codigoOf({ extras: { codigo: 'a b' } })).toBeNull();
    expect(codigoOf(null)).toBeNull();
  });

  it('candidatas: normaliza, na ordem, sem repetir, no máximo 3', () => {
    expect(codigoCandidates(['  A ', 'b', 'a', 'Local:C', 'd'])).toEqual(['a', 'b', 'local:c']);
    expect(codigoCandidates(undefined)).toEqual([]);
  });

  it('descarta formato inseguro (espaço, vírgula, parênteses, aspas, muito longa)', () => {
    expect(codigoCandidates(['a b', 'a,b', 'a)b', 'a"b', 'x'.repeat(121), 'ok:1'])).toEqual(['ok:1']);
  });
});

describe('linkedRailTitle', () => {
  const t = (vinculosTitulo: unknown) => linkedRailTitle({ extras: { vinculosTitulo } });
  it('usa vinculosTitulo aparado', () => expect(t('  Próximos eventos ')).toBe('Próximos eventos'));
  it('vazio, em branco, não-string ou ausente → "Vinculados"', () => {
    expect(t('')).toBe('Vinculados');
    expect(t('   ')).toBe('Vinculados');
    expect(t(5)).toBe('Vinculados');
    expect(linkedRailTitle({ extras: {} })).toBe('Vinculados');
    expect(linkedRailTitle(null)).toBe('Vinculados');
  });
  it('mais de 60 caracteres é ignorado; 60 passa', () => {
    expect(t('x'.repeat(61))).toBe('Vinculados');
    expect(t('x'.repeat(60))).toBe('x'.repeat(60));
  });
});

describe('vínculos (editor)', () => {
  it('serviceLinksOf lê extras, ausente vira vazio', () => {
    expect(serviceLinksOf({ codigo: ' a ', tags: ['B', 'b', ''], vinculosTitulo: ' T ' })).toEqual({
      codigo: 'a',
      tags: ['b'],
      vinculosTitulo: 'T',
    });
    expect(serviceLinksOf(null)).toEqual({ codigo: '', tags: [], vinculosTitulo: '' });
  });

  it('parseTagsInput separa por vírgula, ponto e vírgula e quebra de linha', () => {
    expect(parseTagsInput('A, b;c\n d ,, a')).toEqual(['a', 'b', 'c', 'd']);
    expect(parseTagsInput('')).toEqual([]);
  });

  it('validateServiceLinks aplica as regras do banco', () => {
    const ok = { codigo: 'casa-x', tags: ['a', 'local:b'], vinculosTitulo: 'Agenda' };
    expect(validateServiceLinks(ok)).toEqual({});
    expect(validateServiceLinks({ ...ok, codigo: 'a b' }).codigo).toBeTruthy();
    expect(validateServiceLinks({ ...ok, codigo: 'x'.repeat(61) }).codigo).toBeTruthy();
    expect(validateServiceLinks({ ...ok, tags: ['A_B', 'c d'] }).tags).toBeTruthy();
    expect(validateServiceLinks({ ...ok, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }).tags).toBeTruthy();
    expect(validateServiceLinks({ ...ok, vinculosTitulo: 'y'.repeat(61) }).vinculosTitulo).toBeTruthy();
    expect(CODIGO_PATTERN.test('a:b')).toBe(false);
    expect(TAG_PATTERN.test('a:b')).toBe(true);
  });

  it('buildServiceLinksPatch devolve só o que mudou', () => {
    const initial = { codigo: 'a', tags: ['x'], vinculosTitulo: 'T' };
    expect(buildServiceLinksPatch(initial, initial)).toEqual({});
    expect(buildServiceLinksPatch({ ...initial, tags: ['x', 'y'] }, initial)).toEqual({ tags: ['x', 'y'] });
    expect(buildServiceLinksPatch({ codigo: '', tags: [], vinculosTitulo: '' }, initial)).toEqual({
      codigo: null,
      tags: [],
      vinculosTitulo: null,
    });
  });
});
