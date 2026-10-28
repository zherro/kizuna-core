// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const auth = vi.hoisted(() => ({ user: null as { is_root?: boolean } | null }));
vi.mock('../../../providers/auth-provider', () => ({ useAuth: () => auth }));

import { RootEditLink } from './root-edit-link';

afterEach(cleanup);

describe('<RootEditLink>', () => {
  it('root vê o link para a edição', () => {
    auth.user = { is_root: true };
    render(<RootEditLink href="/painel/meus-servicos/42" />);
    expect(screen.getByRole('link', { name: /editar/i }).getAttribute('href')).toBe('/painel/meus-servicos/42');
  });

  it.each([null, { is_root: false }, {}])('sem root (%o) não mostra nada', (user) => {
    auth.user = user;
    render(<RootEditLink href="/painel/meus-servicos/42" />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});
