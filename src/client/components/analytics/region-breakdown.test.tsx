// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { RegionBreakdown } from './region-breakdown';

afterEach(cleanup);

const row = (i: number, views: number, share: number) => ({
  key: `r${i}`,
  label: `Cidade ${i}/MT`,
  uf: 'MT',
  city: `Cidade ${i}`,
  views,
  share,
});

describe('RegionBreakdown', () => {
  it('mostra cidade/UF, só UF e Não informado com views e percentuais', () => {
    render(
      <RegionBreakdown
        items={[
          { key: 'cuiaba|MT', label: 'Cuiabá/MT', uf: 'MT', city: 'Cuiabá', views: 50, share: 63 },
          { key: 'SP', label: 'SP', uf: 'SP', city: null, views: 20, share: 25 },
          { key: '_none', label: 'Não informado', uf: '', city: null, views: 10, share: 13 },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Onde estão seus visitantes' })).toBeTruthy();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Cuiabá/MT');
    expect(items[0].textContent).toContain('50');
    expect(items[0].textContent).toContain('63%');
    expect(items[1].textContent).toContain('SP');
    expect(items[2].textContent).toContain('Não informado');
    expect(items[2].textContent).toContain('13%');
  });

  it('mostra só as 10 primeiras e diz quantas ficaram de fora', () => {
    const items = Array.from({ length: 13 }, (_, i) => row(i, 100 - i, 7));
    render(<RegionBreakdown items={items} />);
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText(/mais 3 regiões/i)).toBeTruthy();
  });

  it('estado vazio explica que o dado só existe para acessos novos', () => {
    render(<RegionBreakdown items={[]} />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByText(/acessos novos/i)).toBeTruthy();
  });
});
