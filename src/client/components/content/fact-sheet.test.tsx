// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MapPin, Phone } from 'lucide-react';
import { FactSheet, QuickActions } from './index';

afterEach(cleanup);

describe('FactSheet', () => {
  it('mostra rótulo e valor; lista vira uma linha por item', () => {
    render(
      <FactSheet
        rows={[
          { icon: MapPin, label: 'Endereço', value: 'Av. X, 100' },
          { label: 'Horário', value: ['Qui a sáb, 22h às 5h', 'Dom, fechado'] },
        ]}
      />
    );
    expect(screen.getByText('Endereço')).toBeTruthy();
    expect(screen.getByText('Av. X, 100')).toBeTruthy();
    expect(screen.getByText('Qui a sáb, 22h às 5h')).toBeTruthy();
    expect(screen.getByText('Dom, fechado')).toBeTruthy();
  });

  it('dt e dd são filhos diretos do mesmo div dentro do dl; ícone fica dentro do dt', () => {
    const { container } = render(
      <FactSheet
        rows={[{ icon: MapPin, label: 'Horário', value: ['Qui a sáb, 22h às 5h', 'Dom, fechado'] }]}
      />
    );
    const dt = container.querySelector('dt') as HTMLElement;
    const dds = Array.from(container.querySelectorAll('dd'));
    expect(dds).toHaveLength(2);
    const group = dt.parentElement as HTMLElement;
    expect(group.tagName).toBe('DIV');
    expect(group.parentElement?.tagName).toBe('DL');
    dds.forEach((dd) => expect(dd.parentElement).toBe(group));
    expect(Array.from(group.children).some((c) => c.tagName.toLowerCase() === 'svg')).toBe(false);
    expect(dt.querySelector('svg')).toBeTruthy();
  });

  it('linha sem valor não aparece', () => {
    render(
      <FactSheet
        rows={[
          { label: 'Telefone', value: '' },
          { label: 'Preço', value: null },
          { label: 'Site', value: [] },
          { label: 'Endereço', value: 'Rua Y' },
        ]}
      />
    );
    expect(screen.queryByText('Telefone')).toBeNull();
    expect(screen.queryByText('Preço')).toBeNull();
    expect(screen.queryByText('Site')).toBeNull();
    expect(screen.getByText('Rua Y')).toBeTruthy();
  });

  it('sem nenhuma linha o bloco some', () => {
    const { container } = render(<FactSheet rows={[{ label: 'A', value: '' }]} />);
    expect(container.innerHTML).toBe('');
  });

  it('link externo abre em nova aba com rel seguro; tel: não', () => {
    render(
      <FactSheet
        rows={[
          { label: 'Site', value: 'exemplo.com', href: 'https://exemplo.com' },
          { icon: Phone, label: 'Telefone', value: '(65) 3000-0000', href: 'tel:6530000000' },
        ]}
      />
    );
    const site = screen.getByRole('link', { name: 'exemplo.com' });
    expect(site.getAttribute('target')).toBe('_blank');
    expect(site.getAttribute('rel')).toContain('noopener');
    const tel = screen.getByRole('link', { name: '(65) 3000-0000' });
    expect(tel.getAttribute('target')).toBeNull();
  });
});

describe('QuickActions', () => {
  it('renderiza um link por ação e marca externo', () => {
    render(
      <QuickActions
        actions={[
          { label: 'Como chegar', href: '#como-chegar' },
          { label: 'Site', href: 'https://exemplo.com', external: true },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Como chegar' }).getAttribute('href')).toBe('#como-chegar');
    expect(screen.getByRole('link', { name: 'Site' }).getAttribute('target')).toBe('_blank');
  });

  it('sem ações não renderiza nada', () => {
    const { container } = render(<QuickActions actions={[]} />);
    expect(container.innerHTML).toBe('');
  });
});
