// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  usePathname: () => '/painel/meus-servicos/novo',
  notFound: vi.fn(),
}));
vi.mock('../providers/auth-provider', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));

import { PanelShellBase } from './panel-shell';

const branding = { kicker: 'K', shortLabel: 'FT', fullLabel: 'Foco Total' };

afterEach(cleanup);

describe('PanelShellBase full-bleed', () => {
  it('um header só, com Menu e o slot extra', () => {
    render(
      <PanelShellBase
        navGroups={[]}
        branding={branding}
        isFullBleedRoute={() => true}
        fullBleedHeaderExtra={<span>extra-slot</span>}
      >
        <div>conteúdo</div>
      </PanelShellBase>
    );
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeTruthy();
    expect(screen.getByText('extra-slot')).toBeTruthy();
    expect(screen.getByText('conteúdo')).toBeTruthy();
  });
});
