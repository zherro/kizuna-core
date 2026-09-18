import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
const mockUsePathname = vi.fn(() => '/painel/meus-servicos/novo');
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
    notFound: () => mockNotFound(),
}));
const mockUseAuth = vi.fn(() => ({ user: null, logout: vi.fn() }));
vi.mock('../providers/auth-provider', () => ({
    useAuth: () => mockUseAuth(),
}));
import { PanelShellBase, isPanelNavItemAccessible } from './panel-shell';
import { Home } from 'lucide-react';
const branding = { kicker: 'K', shortLabel: 'FT', fullLabel: 'Foco Total' };
describe('isPanelNavItemAccessible', () => {
    it('sem permResource/rootOnly/visibleIf, é sempre acessível', () => {
        expect(isPanelNavItemAccessible({}, null)).toBe(true);
    });
    it('permResource exige hasPerm verdadeiro', () => {
        const item = { permResource: 'categorias' };
        expect(isPanelNavItemAccessible(item, { hasPerm: () => false })).toBe(false);
        expect(isPanelNavItemAccessible(item, { hasPerm: (r) => r === 'categorias' })).toBe(true);
    });
    it('visibleIf passa se QUALQUER condição bate (OR)', () => {
        const item = { visibleIf: [{ permResource: 'forms' }, { rootOnly: true }] };
        expect(isPanelNavItemAccessible(item, { hasPerm: () => false, is_root: false })).toBe(false);
        expect(isPanelNavItemAccessible(item, { hasPerm: () => false, is_root: true })).toBe(true);
        expect(isPanelNavItemAccessible(item, { hasPerm: (r) => r === 'forms', is_root: false })).toBe(true);
    });
    it('visibleIf presente ignora permResource/rootOnly do próprio item', () => {
        const item = { rootOnly: true, visibleIf: [{ permResource: 'forms' }] };
        expect(isPanelNavItemAccessible(item, { hasPerm: (r) => r === 'forms', is_root: false })).toBe(true);
    });
});
afterEach(() => {
    cleanup();
    mockNotFound.mockClear();
    mockUsePathname.mockReset().mockReturnValue('/painel/meus-servicos/novo');
    mockUseAuth.mockReset().mockReturnValue({ user: null, logout: vi.fn() });
});
describe('PanelShellBase full-bleed', () => {
    it('um header só, com Menu e o slot extra', () => {
        render(_jsx(PanelShellBase, { navGroups: [], branding: branding, isFullBleedRoute: () => true, fullBleedHeaderExtra: _jsx("span", { children: "extra-slot" }), children: _jsx("div", { children: "conte\u00FAdo" }) }));
        expect(screen.getAllByRole('banner')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Abrir menu' })).toBeTruthy();
        expect(screen.getByText('extra-slot')).toBeTruthy();
        expect(screen.getByText('conteúdo')).toBeTruthy();
    });
});
describe('PanelShellBase — sidebarHidden e visibleIf', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/painel/administracao/catalogo/categorias');
    });
    const groups = [
        {
            title: 'Administração',
            items: [
                {
                    title: 'Categorias',
                    href: '/painel/administracao/catalogo/categorias',
                    icon: Home,
                    permResource: 'categorias',
                    sidebarHidden: true,
                },
                {
                    title: 'Catálogo',
                    href: '/painel/administracao/catalogo',
                    icon: Home,
                    visibleIf: [{ permResource: 'categorias' }],
                },
            ],
        },
    ];
    it('item com sidebarHidden não aparece no menu', () => {
        mockUseAuth.mockReturnValue({
            user: { hasPerm: (r) => r === 'categorias', is_root: false },
            logout: vi.fn(),
        });
        render(_jsx(PanelShellBase, { navGroups: groups, branding: branding, children: _jsx("div", { children: "conte\u00FAdo" }) }));
        expect(screen.queryByText('Categorias')).toBeNull();
        expect(screen.getByText('Catálogo')).toBeTruthy();
    });
    it('sidebarHidden não afeta checkPagePermission — navegação direta continua liberada', () => {
        mockUseAuth.mockReturnValue({
            user: { hasPerm: (r) => r === 'categorias', is_root: false },
            logout: vi.fn(),
        });
        render(_jsx(PanelShellBase, { navGroups: groups, branding: branding, children: _jsx("div", { children: "conte\u00FAdo" }) }));
        expect(mockNotFound).not.toHaveBeenCalled();
    });
    it('visibleIf com permissão ausente bloqueia a navegação direta ao hub', () => {
        mockUsePathname.mockReturnValue('/painel/administracao/catalogo');
        mockUseAuth.mockReturnValue({
            user: { hasPerm: () => false, is_root: false },
            logout: vi.fn(),
        });
        render(_jsx(PanelShellBase, { navGroups: groups, branding: branding, children: _jsx("div", { children: "conte\u00FAdo" }) }));
        expect(mockNotFound).toHaveBeenCalled();
    });
    it('visibleIf com is_root satisfaz uma condição rootOnly', () => {
        const rootGroups = [
            {
                title: 'Administração',
                items: [
                    {
                        title: 'Sistema',
                        href: '/painel/administracao/sistema',
                        icon: Home,
                        visibleIf: [{ rootOnly: true }],
                    },
                ],
            },
        ];
        mockUsePathname.mockReturnValue('/painel/administracao/sistema');
        mockUseAuth.mockReturnValue({
            user: { hasPerm: () => false, is_root: true },
            logout: vi.fn(),
        });
        render(_jsx(PanelShellBase, { navGroups: rootGroups, branding: branding, children: _jsx("div", { children: "conte\u00FAdo" }) }));
        expect(screen.getByText('Sistema')).toBeTruthy();
        expect(mockNotFound).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=panel-shell.test.js.map