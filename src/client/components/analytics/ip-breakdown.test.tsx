// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { IpBreakdown } from './ip-breakdown';

afterEach(cleanup);

describe('IpBreakdown', () => {
  it('tabela com IP mascarado, acessos e visitantes-dia; linhas separadas por ipKey', () => {
    render(
      <IpBreakdown
        items={[
          { ipKey: 'k1', ipMasked: '187.12.45.•', views: 1340, visitorDays: 3 },
          { ipKey: 'k2', ipMasked: '187.12.45.•', views: 12, visitorDays: 1 },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Acessos por IP' })).toBeTruthy();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'IP' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Acessos' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Visitantes-dia' })).toBeTruthy();
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('187.12.45.•');
    expect(rows[0].textContent).toContain('1.340');
    expect(rows[0].textContent).toContain('3');
    expect(rows[1].textContent).toContain('187.12.45.•');
    expect(screen.getByText(/IP parcialmente oculto/i)).toBeTruthy();
  });

  it('nunca mostra um IP completo: só renderiza o que veio em ipMasked', () => {
    const { container } = render(
      <IpBreakdown items={[{ ipKey: 'k1', ipMasked: '187.12.45.•', views: 2, visitorDays: 1 }]} />,
    );
    expect(container.textContent).not.toMatch(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    expect(container.textContent).not.toContain('k1');
  });

  it('estado vazio explica que o dado só existe para acessos novos', () => {
    render(<IpBreakdown items={[]} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/acessos novos/i)).toBeTruthy();
  });
});
