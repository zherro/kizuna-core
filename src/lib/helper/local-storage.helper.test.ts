// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isSnoozed,
  readStorage,
  removeStorage,
  snooze,
  writeStorage,
} from './local-storage.helper';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('readStorage / writeStorage / removeStorage', () => {
  it('grava e lê JSON', () => {
    expect(writeStorage('k', { a: 1 })).toBe(true);
    expect(readStorage<{ a: number }>('k')).toEqual({ a: 1 });
  });

  it('chave ausente → null', () => {
    expect(readStorage('nada')).toBeNull();
  });

  it('JSON corrompido → null (não lança)', () => {
    localStorage.setItem('k', '{quebrado');
    expect(readStorage('k')).toBeNull();
  });

  it('storage indisponível → leitura null e escrita false', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(readStorage('k')).toBeNull();
    expect(writeStorage('k', 1)).toBe(false);
  });

  it('remove', () => {
    writeStorage('k', 1);
    removeStorage('k');
    expect(readStorage('k')).toBeNull();
  });
});

describe('snooze / isSnoozed', () => {
  const DAY = 86_400_000;

  it('fica adiado até o prazo e volta depois', () => {
    const now = Date.UTC(2026, 8, 30);
    snooze('card', 15, now);
    expect(isSnoozed('card', now + 14 * DAY)).toBe(true);
    expect(isSnoozed('card', now + 15 * DAY)).toBe(false);
  });

  it('prazo vencido limpa a chave', () => {
    const now = Date.UTC(2026, 8, 30);
    snooze('card', 1, now);
    isSnoozed('card', now + 2 * DAY);
    expect(readStorage('card')).toBeNull();
  });

  it('sem registro ou valor inválido → não adiado', () => {
    expect(isSnoozed('card')).toBe(false);
    writeStorage('card', 'lixo');
    expect(isSnoozed('card')).toBe(false);
  });
});
