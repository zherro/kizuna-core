import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlaceHighlights, type PlaceHighlightItem } from './place-highlights';

const item = (n: number, extra: Partial<PlaceHighlightItem> = {}): PlaceHighlightItem => ({
  href: `/cuiaba-mt/lugares/lugar-${n}`,
  title: `Lugar ${n}`,
  kicker: n % 2 ? 'Shopping' : 'Casa de festas',
  ...extra,
});

describe('PlaceHighlights', () => {
  it('sem itens não renderiza nada', () => {
    expect(renderToStaticMarkup(<PlaceHighlights items={[]} />)).toBe('');
  });

  it('monta o destaque e o índice com links, chapéu e título da seção', () => {
    const html = renderToStaticMarkup(
      <PlaceHighlights
        items={[item(1, { summary: 'Resumo do lugar.', image: '/lugares/lugar-1/01.jpg', meta: 'Av. X, 100' }), item(2), item(3)]}
        moreHref="/cuiaba-mt/lugares"
      />
    );
    expect(html).toContain('<section aria-labelledby=');
    expect(html).toContain('Lugares da cidade');
    expect(html).toContain('href="/cuiaba-mt/lugares"');
    for (const n of [1, 2, 3]) expect(html).toContain(`href="/cuiaba-mt/lugares/lugar-${n}"`);
    expect(html).toContain('Resumo do lugar.');
    expect(html).toContain('src="/lugares/lugar-1/01.jpg"');
    expect(html).toContain('Shopping');
    expect(html).toContain('Casa de festas');
    expect(html.match(/<li /g)).toHaveLength(2);
  });

  it('sem foto usa o fundo do grupo e sem moreHref não tem "Ver todos"', () => {
    const html = renderToStaticMarkup(<PlaceHighlights items={[item(1)]} title="Onde ir" />);
    expect(html).not.toContain('<img');
    expect(html).toContain('linear-gradient(150deg');
    expect(html).toContain('Onde ir');
    expect(html).not.toContain('Ver todos');
    expect(html).not.toContain('<ul');
  });
});
