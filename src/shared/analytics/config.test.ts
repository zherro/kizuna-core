import { describe, it, expect } from 'vitest';
import { parseAnalyticsConfig, resolveEventRule } from './config';

describe('parseAnalyticsConfig', () => {
  it('sem bloco = habilitado com defaults', () => {
    const c = parseAnalyticsConfig(undefined);
    expect(c.enabled).toBe(true);
    expect(resolveEventRule(c, 'service', 'view')).toEqual({
      minVisibleMs: 1500,
      minVisibleRatio: 0.5,
      oncePerSession: true,
    });
    expect(resolveEventRule(c, 'service', 'contact_click')).toEqual({
      minVisibleMs: 0,
      minVisibleRatio: 0,
      oncePerSession: false,
    });
  });

  it('piso do impression: minVisibleMs 10 sobe para 200', () => {
    const c = parseAnalyticsConfig({ events: { impression: { minVisibleMs: 10 } } });
    expect(resolveEventRule(c, 'service', 'impression')?.minVisibleMs).toBe(200);
  });

  it('enabled:false desliga tudo', () => {
    const c = parseAnalyticsConfig({ enabled: false });
    expect(resolveEventRule(c, 'service', 'view')).toBeNull();
  });

  it('events listado liga só os listados', () => {
    const c = parseAnalyticsConfig({ events: { view: { minVisibleMs: 2000 } } });
    expect(resolveEventRule(c, 'service', 'view')?.minVisibleMs).toBe(2000);
    expect(resolveEventRule(c, 'service', 'favorite')).toBeNull();
  });

  it('minVisibleMs abaixo do piso sobe ao piso; acima do teto cai no teto', () => {
    const c = parseAnalyticsConfig({
      events: { view: { minVisibleMs: 10 }, impression: { minVisibleMs: 999999 } },
    });
    expect(resolveEventRule(c, 'service', 'view')?.minVisibleMs).toBe(500);
    expect(resolveEventRule(c, 'service', 'impression')?.minVisibleMs).toBe(60000);
  });

  it('ratio é limitado a 0..1 e valores inválidos caem no default', () => {
    const c = parseAnalyticsConfig({
      events: { view: { minVisibleRatio: 7, minVisibleMs: 'x' } },
    });
    const r = resolveEventRule(c, 'service', 'view')!;
    expect(r.minVisibleRatio).toBe(1);
    expect(r.minVisibleMs).toBe(1500);
  });

  it('override por entidade vence o global e respeita o piso', () => {
    const c = parseAnalyticsConfig({
      entities: { service: { events: { view: { minVisibleMs: 3000 } } } },
    });
    expect(resolveEventRule(c, 'service', 'view')?.minVisibleMs).toBe(3000);
    expect(resolveEventRule(c, 'other', 'view')?.minVisibleMs).toBe(1500);

    const low = parseAnalyticsConfig({
      entities: { service: { events: { view: { minVisibleMs: 1 } } } },
    });
    expect(resolveEventRule(low, 'service', 'view')?.minVisibleMs).toBe(500);
  });

  it('collect: defaults', () => {
    expect(parseAnalyticsConfig({}).collect).toEqual({
      device: true,
      region: true,
      ip: true,
      encryptIp: true,
      ipRetentionDays: 30,
    });
  });

  it('collect: respeita valores informados', () => {
    const c = parseAnalyticsConfig({
      collect: { ip: false, encryptIp: false, ipRetentionDays: 7 },
    });
    expect(c.collect).toEqual({
      device: true,
      region: true,
      ip: false,
      encryptIp: false,
      ipRetentionDays: 7,
    });
  });

  it('collect: ipRetentionDays inválido cai em 30; 0 é aceito', () => {
    for (const bad of [-1, 1.5, '7', null, NaN]) {
      expect(parseAnalyticsConfig({ collect: { ipRetentionDays: bad } }).collect.ipRetentionDays).toBe(30);
    }
    expect(parseAnalyticsConfig({ collect: { ipRetentionDays: 0 } }).collect.ipRetentionDays).toBe(0);
  });

  it('collect: não booleano cai no padrão', () => {
    const c = parseAnalyticsConfig({ collect: { device: 'no', region: 0 } });
    expect(c.collect.device).toBe(true);
    expect(c.collect.region).toBe(true);
  });

  it('lixo no bloco não quebra', () => {
    expect(() => parseAnalyticsConfig('x')).not.toThrow();
    expect(() => parseAnalyticsConfig({ events: 5, entities: [] })).not.toThrow();
  });
});
