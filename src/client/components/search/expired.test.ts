import { describe, expect, it } from 'vitest';
import { DEFAULT_EXPIRED_LABEL, expiredGraceParam, expiredLabelFor } from './expired';

const cfg = { eventos: { days: 2, label: 'Já aconteceu' }, lugares: { days: 0 }, cinema: { days: 3 } };
const now = Date.parse('2026-11-15T12:00:00Z');

describe('expiredGraceParam', () => {
  it('só envia grupos com dias válidos (inteiro 1..365)', () => {
    expect(expiredGraceParam(cfg)).toEqual({ eventos: 2, cinema: 3 });
    expect(expiredGraceParam({ a: { days: 1.5 }, b: { days: -1 }, c: { days: 400 } })).toBeUndefined();
  });
  it('sem config não envia nada (banco sem a 0013 recusa a chave)', () => {
    expect(expiredGraceParam(undefined)).toBeUndefined();
    expect(expiredGraceParam({})).toBeUndefined();
  });
});

describe('expiredLabelFor', () => {
  it('vencido em grupo configurado → label do config', () => {
    expect(expiredLabelFor(cfg, 'eventos', '2026-11-14T03:59:59.999Z', now)).toBe('Já aconteceu');
  });
  it('sem label no config → padrão', () => {
    expect(expiredLabelFor(cfg, 'cinema', '2026-11-14T00:00:00Z', now)).toBe(DEFAULT_EXPIRED_LABEL);
  });
  it('não vencido, sem validade ou grupo sem config → null', () => {
    expect(expiredLabelFor(cfg, 'eventos', '2026-11-16T00:00:00Z', now)).toBeNull();
    expect(expiredLabelFor(cfg, 'eventos', null, now)).toBeNull();
    expect(expiredLabelFor(cfg, 'turismo', '2026-11-01T00:00:00Z', now)).toBeNull();
    expect(expiredLabelFor(cfg, 'lugares', '2026-11-01T00:00:00Z', now)).toBeNull(); // days inválido
    expect(expiredLabelFor(undefined, 'eventos', '2026-11-01T00:00:00Z', now)).toBeNull();
    expect(expiredLabelFor(cfg, null, '2026-11-01T00:00:00Z', now)).toBeNull();
  });
  it('data inválida → null', () => {
    expect(expiredLabelFor(cfg, 'eventos', 'lixo', now)).toBeNull();
  });
});
