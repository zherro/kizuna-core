// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NewsCompactList } from './news-compact-list';
import type { NewsHighlightItem } from './news-highlights-format';

const item = (n: number, extra: Partial<NewsHighlightItem> = {}): NewsHighlightItem => ({
  href: `/noticias/n-${n}`,
  title: `Notícia ${n}`,
  kicker: 'Cultura',
  image: `/thumb-${n}.jpg`,
  publishedAt: `2026-11-${String(10 + n).padStart(2, '0')}T12:00:00-03:00`,
  ...extra,
});

afterEach(cleanup);

describe('NewsCompactList', () => {
  it('sem itens válidos não renderiza nada', () => {
    const { container } = render(<NewsCompactList items={[{ ...item(1), title: '  ' }]} />);
    expect(container.innerHTML).toBe('');
  });

  it('mostra só `limit` itens (default 4), na ordem recebida, com miniatura lazy de 64px e data', () => {
    const { container } = render(
      <NewsCompactList items={[1, 2, 3, 4, 5, 6].map((n) => item(n))} moreHref="/busca?group=noticias" />
    );
    const rows = container.querySelectorAll('li');
    expect(rows).toHaveLength(4);
    expect([...rows].map((li) => li.querySelector('a')?.getAttribute('href'))).toEqual([
      '/noticias/n-1',
      '/noticias/n-2',
      '/noticias/n-3',
      '/noticias/n-4',
    ]);
    const img = rows[0].querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('width')).toBe('64');
    expect(img.getAttribute('fetchpriority')).toBeNull();
    expect(rows[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-11-11T15:00:00.000Z');
    expect(screen.getByText('Ver todas').getAttribute('href')).toBe('/busca?group=noticias');
  });

  it('sem imagem (ou se ela falhar) usa o painel do chapéu', () => {
    const { container } = render(<NewsCompactList items={[item(1, { image: null }), item(2)]} limit={2} />);
    const rows = container.querySelectorAll('li');
    expect(rows[0].querySelector('img')).toBeNull();
    fireEvent.error(rows[1].querySelector('img')!);
    expect(rows[1].querySelector('img')).toBeNull();
  });
});
