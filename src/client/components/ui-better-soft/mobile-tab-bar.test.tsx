// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Home, Search, PlusCircle } from 'lucide-react';

const mockUsePathname = vi.fn(() => '/');
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

const mockUseAuth = vi.fn(() => ({ user: null as unknown, loading: false }));
vi.mock('../../providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

import { MobileTabBar, isTabActive, isTabVisible, type MobileTabItem } from './mobile-tab-bar';

const items: MobileTabItem[] = [
  { href: '/', label: 'Início', icon: <Home /> },
  { href: '/busca', label: 'Buscar', icon: <Search /> },
  { href: '/painel/meus-servicos/novo', label: 'Anunciar', icon: <PlusCircle />, featured: true },
  { href: '/painel/meus-servicos', label: 'Meus anúncios', icon: <Home />, requiresAuth: true },
  { href: '/painel/minha-conta', label: 'Conta', icon: <Home />, requiresAuth: true },
];

describe('isTabActive', () => {
  it('"/" só bate exato', () => {
    expect(isTabActive({ href: '/' }, '/')).toBe(true);
    expect(isTabActive({ href: '/' }, '/busca')).toBe(false);
  });

  it('demais itens batem por prefixo de segmento', () => {
    expect(isTabActive({ href: '/busca' }, '/busca')).toBe(true);
    expect(isTabActive({ href: '/busca' }, '/busca/x')).toBe(true);
    expect(isTabActive({ href: '/busca' }, '/buscar-outro')).toBe(false);
  });

  it('o item mais específico vence o mais genérico', () => {
    expect(isTabActive({ href: '/painel/meus-servicos', exact: true }, '/painel/meus-servicos/novo')).toBe(
      false
    );
    expect(isTabActive({ href: '/painel/meus-servicos', exact: true }, '/painel/meus-servicos')).toBe(true);
  });

  it('match customizado substitui a regra padrão', () => {
    expect(isTabActive({ href: '/x', match: ['/a', '/b'] }, '/b/1')).toBe(true);
    expect(isTabActive({ href: '/x', match: ['/a', '/b'] }, '/x')).toBe(false);
  });
});

describe('MobileTabBar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
    mockUseAuth.mockReturnValue({ user: null, loading: false });
  });
  afterEach(() => cleanup());

  it('renderiza os 5 itens com rótulo', () => {
    render(<MobileTabBar items={items} />);
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByText('Meus anúncios')).toBeTruthy();
  });

  it('marca o item ativo com aria-current="page"', () => {
    mockUsePathname.mockReturnValue('/busca');
    render(<MobileTabBar items={items} />);
    expect(screen.getByRole('link', { name: /Buscar/ }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: /Início/ }).getAttribute('aria-current')).toBeNull();
  });

  it('deslogado, itens requiresAuth vão para /login?returnTo=', () => {
    render(<MobileTabBar items={items} />);
    expect(screen.getByRole('link', { name: /Conta/ }).getAttribute('href')).toBe(
      '/login?returnTo=%2Fpainel%2Fminha-conta'
    );
    expect(screen.getByRole('link', { name: /Buscar/ }).getAttribute('href')).toBe('/busca');
  });

  it('logado, itens requiresAuth apontam direto para o destino', () => {
    mockUseAuth.mockReturnValue({ user: { user_id: 'u1' }, loading: false });
    render(<MobileTabBar items={items} />);
    expect(screen.getByRole('link', { name: /Conta/ }).getAttribute('href')).toBe('/painel/minha-conta');
  });

  it('enquanto a sessão carrega, não redireciona para /login', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<MobileTabBar items={items} />);
    expect(screen.getByRole('link', { name: /Conta/ }).getAttribute('href')).toBe('/painel/minha-conta');
  });

  it('some nas rotas de hideOn', () => {
    mockUsePathname.mockReturnValue('/painel/meus-servicos/novo');
    const { container } = render(<MobileTabBar items={items} hideOn={['/painel/meus-servicos/novo']} />);
    expect(container.firstChild).toBeNull();
  });

  describe('guestItems', () => {
    const guestItems: MobileTabItem[] = [
      { href: '/', label: 'Início', icon: <Home /> },
      { href: '/busca', label: 'Buscar', icon: <Search /> },
      { href: '/painel/meus-servicos/novo', label: 'Anunciar', icon: <PlusCircle />, featured: true, requiresAuth: true },
      { href: '/descobrir', label: 'Descobrir', icon: <Search /> },
      { href: '/login', label: 'Entrar', icon: <Home />, match: ['/login', '/registre-se'] },
    ];

    it('deslogado, mostra os guestItems no lugar dos items', () => {
      render(<MobileTabBar items={items} guestItems={guestItems} />);
      expect(screen.getAllByRole('link')).toHaveLength(5);
      expect(screen.getByText('Entrar')).toBeTruthy();
      expect(screen.getByText('Descobrir')).toBeTruthy();
      expect(screen.queryByText('Meus anúncios')).toBeNull();
      expect(screen.queryByText('Conta')).toBeNull();
    });

    it('nos guestItems, requiresAuth ainda manda para /login?returnTo=', () => {
      render(<MobileTabBar items={items} guestItems={guestItems} />);
      expect(screen.getByRole('link', { name: /Anunciar/ }).getAttribute('href')).toBe(
        '/login?returnTo=%2Fpainel%2Fmeus-servicos%2Fnovo'
      );
      expect(screen.getByRole('link', { name: /Entrar/ }).getAttribute('href')).toBe('/login');
    });

    it('"Entrar" fica ativo em /login e /registre-se', () => {
      mockUsePathname.mockReturnValue('/registre-se');
      render(<MobileTabBar items={items} guestItems={guestItems} />);
      expect(screen.getByRole('link', { name: /Entrar/ }).getAttribute('aria-current')).toBe('page');
    });

    it('logado, ignora os guestItems', () => {
      mockUseAuth.mockReturnValue({ user: { user_id: 'u1' }, loading: false });
      render(<MobileTabBar items={items} guestItems={guestItems} />);
      expect(screen.getByText('Conta')).toBeTruthy();
      expect(screen.queryByText('Entrar')).toBeNull();
    });

    it('enquanto a sessão carrega, mostra os items (não pisca "Entrar" para quem está logado)', () => {
      mockUseAuth.mockReturnValue({ user: null, loading: true });
      render(<MobileTabBar items={items} guestItems={guestItems} />);
      expect(screen.getByText('Conta')).toBeTruthy();
      expect(screen.queryByText('Entrar')).toBeNull();
    });
  });

  it('publica --mobile-tab-h no <html> enquanto montada e limpa ao sair', () => {
    const { unmount } = render(<MobileTabBar items={items} />);
    expect(document.documentElement.style.getPropertyValue('--mobile-tab-h')).not.toBe('');
    unmount();
    expect(document.documentElement.style.getPropertyValue('--mobile-tab-h')).toBe('');
  });
});

describe('isTabVisible', () => {
  it('onlyOn mostra o item só dentro dos prefixos', () => {
    expect(isTabVisible({ onlyOn: ['/painel'] }, '/painel/meus-servicos')).toBe(true);
    expect(isTabVisible({ onlyOn: ['/painel'] }, '/busca')).toBe(false);
  });

  it('exceptOn esconde o item dentro dos prefixos', () => {
    expect(isTabVisible({ exceptOn: ['/painel'] }, '/painel')).toBe(false);
    expect(isTabVisible({ exceptOn: ['/painel'] }, '/')).toBe(true);
  });

  it('sem regras o item sempre aparece', () => {
    expect(isTabVisible({}, '/qualquer')).toBe(true);
  });
});
