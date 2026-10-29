// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ListingResultCard } from './listing-result-card';

vi.mock('next/link', () => ({
  default: (p: { href: string; className?: string; children: React.ReactNode }) => (
    <a href={p.href} className={p.className}>
      {p.children}
    </a>
  ),
}));

afterEach(cleanup);
const base = { href: '/a', title: 'Corte', priceLabel: 'R$ 10' };

describe('ListingResultCard locationLabel', () => {
  it.each(['grid', 'strip'] as const)('mostra o local (%s)', (variant) => {
    render(<ListingResultCard {...base} variant={variant} locationLabel="Cuiabá +2" />);
    expect(screen.getByText('Cuiabá +2')).toBeTruthy();
  });
  it('sem locationLabel nada é renderizado', () => {
    render(<ListingResultCard {...base} />);
    expect(screen.queryByText(/Cuiabá/)).toBeNull();
  });
});

describe('ListingResultCard cardStyle="evento"', () => {
  const evento = {
    ...base,
    cardStyle: 'evento' as const,
    priceLabel: 'R$ 40,00',
    priceCaption: 'A partir de',
    dateLabel: { day: '14', month: 'nov' },
    whenLabel: 'sáb., 14 de nov. · 20:00',
    locationLabel: 'Arena Pantanal',
    ctaLabel: 'Ver evento',
    rating: 4.5,
    reviewCount: 3,
  };

  it.each(['grid', 'strip'] as const)('mostra data e local, sem preço (%s)', (variant) => {
    render(<ListingResultCard {...evento} variant={variant} />);
    expect(screen.getByText('14')).toBeTruthy();
    expect(screen.getByText('nov')).toBeTruthy();
    expect(screen.getByText(/14 de nov./)).toBeTruthy();
    expect(screen.queryByText('R$ 40,00')).toBeNull();
    expect(screen.queryByText('A partir de')).toBeNull();
  });

  it('grid: mesmo card do carrossel — local, sem CTA e sem nota', () => {
    render(<ListingResultCard {...evento} />);
    expect(screen.getByText('Arena Pantanal')).toBeTruthy();
    expect(screen.queryByText('Ver evento')).toBeNull();
    expect(screen.queryByText('4,5')).toBeNull();
    expect(screen.queryByText('Novo')).toBeNull();
  });

  it.each(['grid', 'strip'] as const)('capa no mesmo modelo do cinema: inteira (%s)', (variant) => {
    const props = { imageUrl: '/c.jpg', title: 'T' };
    const { container: ev } = render(<ListingResultCard {...evento} {...props} variant={variant} />);
    const evClass = ev.querySelector('img')?.className;
    cleanup();
    const { container: ci } = render(
      <ListingResultCard {...base} {...props} cardStyle="cinema" variant={variant} />
    );
    expect(evClass).toContain('object-contain');
    expect(evClass).toBe(ci.querySelector('img')?.className);
  });

  it('sem dateLabel não renderiza bloco de data', () => {
    render(<ListingResultCard {...evento} dateLabel={null} whenLabel={null} />);
    expect(screen.queryByText('nov')).toBeNull();
  });

  it('default ignora dateLabel', () => {
    render(<ListingResultCard {...base} dateLabel={{ day: '14', month: 'nov' }} />);
    expect(screen.queryByText('nov')).toBeNull();
  });
});

describe('ListingResultCard expiredLabel (vencido)', () => {
  const evento = {
    ...base,
    cardStyle: 'evento' as const,
    dateLabel: { day: '14', month: 'nov' },
    whenLabel: 'sáb., 14 de nov.',
    imageUrl: '/c.jpg',
    highlighted: true,
    highlightLabel: 'Patrocinado',
  };

  it.each(['grid', 'strip'] as const)('evento: selo com o texto, capa em cinza e corpo claro (%s)', (variant) => {
    const { container } = render(<ListingResultCard {...evento} variant={variant} expiredLabel="Já aconteceu" />);
    expect(screen.getByText('Já aconteceu')).toBeTruthy();
    const img = container.querySelector('img')!;
    expect(img.className).toContain('grayscale');
    expect(img.className).toContain('opacity-60');
    expect(container.querySelector('a > div:last-child')!.className).toContain('opacity-60');
    // o selo fica nítido: não está dentro do bloco apagado
    expect(screen.getByText('Já aconteceu').closest('a > div:last-child')).toBeNull();
  });

  it('o destaque some quando vencido (compacto)', () => {
    render(<ListingResultCard {...evento} variant="strip" expiredLabel="Já aconteceu" />);
    expect(screen.queryByText('Patrocinado')).toBeNull();
  });

  it('default: selo no canto superior esquerdo e apagado por seletores filhos', () => {
    const { container } = render(
      <ListingResultCard {...base} imageUrl="/c.jpg" highlighted highlightLabel="Patrocinado" expiredLabel="Encerrado" />
    );
    expect(screen.getByText('Encerrado')).toBeTruthy();
    expect(screen.queryByText('Patrocinado')).toBeNull();
    const cls = container.querySelector('a')!.className;
    expect(cls).toContain('[&>div:first-child_img]:grayscale');
    expect(cls).toContain('[&>div:last-child]:opacity-60');
  });

  it.each([undefined, null, '', '   '])('sem selo (%j) nada muda', (label) => {
    const { container } = render(
      <ListingResultCard {...evento} variant="strip" expiredLabel={label as string | null | undefined} />
    );
    expect(screen.queryByText('Já aconteceu')).toBeNull();
    expect(screen.getByText('Patrocinado')).toBeTruthy();
    expect(container.querySelector('img')!.className).not.toContain('grayscale');
    expect(container.querySelector('a > div:last-child')!.className).not.toContain('opacity-60');
  });
});

describe('ListingResultCard cardStyle="lugar"', () => {
  const lugar = { ...base, cardStyle: 'lugar' as const, priceLabel: null, ctaLabel: 'Ver lugar' };

  it.each(['grid', 'strip'] as const)('sem avaliações não mostra o selo "Novo" (%s)', (variant) => {
    render(<ListingResultCard {...lugar} variant={variant} rating={null} reviewCount={0} />);
    expect(screen.queryByText('Novo')).toBeNull();
  });

  it('com avaliações mostra a nota', () => {
    render(<ListingResultCard {...lugar} rating={4.5} reviewCount={3} />);
    expect(screen.getByText('4,5')).toBeTruthy();
  });

  it('default continua com "Novo" sem avaliações', () => {
    render(<ListingResultCard {...base} />);
    expect(screen.getByText('Novo')).toBeTruthy();
  });
});
