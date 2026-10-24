import { describe, expect, it } from 'vitest';
import { refItems, refPersistValue, refSingleValue, validateLocationRefs } from './location-refs';

const local = { key: 'local_ref', label: 'Local', groups: ['lugares'] };
const pontos = { key: 'pontos_de_venda', label: 'Pontos', groups: ['lugares'], multiple: true, withLink: true };

describe('location refs', () => {
  it('um só: grava o uid, vazio vira null', () => {
    expect(refPersistValue(local, ' abc ')).toBe('abc');
    expect(refPersistValue(local, '')).toBeNull();
    expect(refSingleValue([{ nome: 'x' }])).toBe('x');
  });

  it('lista: aceita strings e objetos, tira vazios e mantém o link', () => {
    expect(refItems(['a', { nome: 'b', link: ' https://x ' }])).toEqual([{ nome: 'a' }, { nome: 'b', link: 'https://x' }]);
    expect(refPersistValue(pontos, [{ nome: '' }, { nome: 'b', link: 'https://x' }])).toEqual([{ nome: 'b', link: 'https://x' }]);
    expect(refPersistValue({ ...pontos, withLink: false }, [{ nome: 'b', link: 'https://x' }])).toEqual([{ nome: 'b' }]);
  });

  it('valida a config', () => {
    expect(() => validateLocationRefs([local, pontos])).not.toThrow();
    expect(() => validateLocationRefs([{ ...local, groups: [] }])).toThrow(/groups/);
    expect(() => validateLocationRefs([local, local])).toThrow(/repetido/);
    expect(() => validateLocationRefs([{ ...local, withLink: true }])).toThrow(/withLink/);
  });
});
