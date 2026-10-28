import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TodayCallout } from './today-callout';
import { TodayEmpty } from './today-empty';
import { TodayHero } from './today-hero';
import { formatTodayDate, todaySearchHref, todaySectionSubtitle } from './today-format';

// 28/10/2026 14:00 em Cuiabá (UTC-4) = 18:00 UTC. Quarta-feira.
const NOW = new Date('2026-10-28T18:00:00Z');

describe('Hoje: formatação', () => {
  it('data por extenso no fuso de Cuiabá', () => {
    expect(formatTodayDate(NOW)).toBe('quarta-feira, 28 de outubro');
  });

  it('perto da meia-noite usa o dia de Cuiabá, não o UTC', () => {
    // 29/10 02:00 UTC ainda é 28/10 22:00 em Cuiabá
    expect(formatTodayDate(new Date('2026-10-29T02:00:00Z'))).toBe('quarta-feira, 28 de outubro');
  });

  it('link do Ver mais: grupo ou categoria, com ou sem cidade', () => {
    const group = { kind: 'group' as const, category: { id: 1, name: 'Eventos', slug: 'eventos' } };
    const cat = { kind: 'category' as const, category: { id: 7, name: 'Bares', slug: 'bares' } };
    expect(todaySearchHref(group)).toBe('/busca?group=eventos');
    expect(todaySearchHref(cat)).toBe('/busca?categoryId=7');
    expect(todaySearchHref(cat, { name: 'Cuiabá', state: 'MT', ibge: '5103403' })).toBe(
      '/busca?categoryId=7&state=MT&cityId=5103403&cityName=Cuiab%C3%A1'
    );
  });

  it('subtítulo só na seção de hoje', () => {
    expect(todaySectionSubtitle({ onlyToday: false, items: [{}] as never })).toBeUndefined();
    expect(todaySectionSubtitle({ onlyToday: true, items: [{}] as never })).toBe('1 começa hoje');
    expect(todaySectionSubtitle({ onlyToday: true, items: [{}, {}] as never })).toBe('2 começam hoje');
  });
});

describe('blocos do Hoje', () => {
  it('TodayHero: h1 com a cidade, data e clima opcional', () => {
    const html = renderToStaticMarkup(<TodayHero cityName="Cuiabá" now={NOW} weather={<span>31°</span>} summary="Bora?" />);
    expect(html).toContain('<h1');
    expect(html).toContain('Hoje em Cuiabá');
    expect(html).toContain('quarta-feira, 28 de outubro');
    expect(html).toContain('31°');
    expect(html).toContain('Bora?');
    expect(renderToStaticMarkup(<TodayHero cityName="X" now={NOW} />)).not.toContain('31°');
  });

  it('TodayEmpty linka para a busca', () => {
    const html = renderToStaticMarkup(<TodayEmpty />);
    expect(html).toContain('href="/busca"');
    expect(html).toContain('<h2');
  });

  it('TodayCallout leva ao href com a data', () => {
    const html = renderToStaticMarkup(<TodayCallout href="/cuiaba-mt/hoje" now={NOW} />);
    expect(html).toContain('href="/cuiaba-mt/hoje"');
    expect(html).toContain('O que tem pra hoje');
    expect(html).toContain('quarta-feira, 28 de outubro');
  });
});
