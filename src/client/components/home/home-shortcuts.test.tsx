// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HomeShortcuts } from './home-shortcuts';

afterEach(cleanup);

describe('HomeShortcuts', () => {
  it('sem itens não renderiza nada', () => {
    const { container } = render(<HomeShortcuts items={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('uma linha com uma coluna por atalho, links com rótulo e o destacado diferente', () => {
    const { container } = render(
      <HomeShortcuts
        items={[
          { href: '/cuiaba-mt/hoje', label: 'Hoje', icon: <svg />, featured: true },
          { href: '/mapa', label: 'Mapa', icon: <svg /> },
          { href: '/descobrir', label: 'Descobrir', icon: <svg /> },
        ]}
      />
    );
    expect(screen.getByRole('navigation', { name: 'Atalhos' })).toBeTruthy();
    expect(container.querySelector('ul')?.getAttribute('style')).toContain('repeat(3, minmax(0, 1fr))');
    const hoje = screen.getByRole('link', { name: 'Hoje' });
    expect(hoje.getAttribute('href')).toBe('/cuiaba-mt/hoje');
    expect(hoje.className).toContain('bg-primary/10');
    expect(screen.getByRole('link', { name: 'Mapa' }).className).not.toContain('bg-primary/10');
  });
});
