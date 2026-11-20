import { describe, expect, it } from 'vitest';
import { buildSiteVisitors, citySlugLabel, utmSourceLabel } from './site';

describe('buildSiteVisitors', () => {
  const rows = [
    { dimension: 'total', key: '', visitors: '10', pages: '25' },
    { dimension: 'source', key: '', visitors: '6', pages: '12' },
    { dimension: 'source', key: 'instagram', visitors: '3', pages: '10' },
    { dimension: 'source', key: 'whatsapp', visitors: 1, pages: 3 },
    { dimension: 'campaign', key: '', visitors: 10, pages: 25 },
    { dimension: 'city', key: 'cuiaba-mt', visitors: 8, pages: 20 },
    { dimension: 'city', key: null, visitors: 2, pages: 5 },
    { dimension: 'device', key: 'mobile', visitors: 9, pages: 22 },
    { dimension: 'device', key: 'desktop', visitors: 1, pages: 3 },
  ];

  it('converte bigint (string) em número, ordena e calcula a participação sobre o total', () => {
    const s = buildSiteVisitors(rows);
    expect(s.visitors).toBe(10);
    expect(s.pages).toBe(25);
    expect(s.empty).toBe(false);
    expect(s.bySource).toEqual([
      { key: '', visitors: 6, pages: 12, share: 60 },
      { key: 'instagram', visitors: 3, pages: 10, share: 30 },
      { key: 'whatsapp', visitors: 1, pages: 3, share: 10 },
    ]);
    expect(s.byCity.map((c) => c.key)).toEqual(['cuiaba-mt', '']);
    expect(s.byDevice[0]).toMatchObject({ key: 'mobile', share: 90 });
  });

  it('sem linhas = vazio, sem divisão por zero', () => {
    expect(buildSiteVisitors([])).toMatchObject({ visitors: 0, pages: 0, empty: true, bySource: [] });
    expect(buildSiteVisitors([{ dimension: 'total', key: '', visitors: 0, pages: 0 }]).empty).toBe(true);
  });
});

describe('rótulos', () => {
  it('origem vazia = Direto; conhecidas com nome próprio', () => {
    expect(utmSourceLabel('')).toMatch(/^Direto/);
    expect(utmSourceLabel('instagram')).toBe('Instagram');
    expect(utmSourceLabel('radio_cbn')).toBe('radio_cbn');
  });

  it('cidade pelo slug', () => {
    expect(citySlugLabel('cuiaba-mt')).toBe('Cuiaba/MT');
    expect(citySlugLabel('chapada-dos-guimaraes-mt')).toBe('Chapada dos Guimaraes/MT');
    expect(citySlugLabel('')).toBe('Não informada');
  });
});
