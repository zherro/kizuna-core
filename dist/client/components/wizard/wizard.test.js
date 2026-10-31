import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
const submitResourceMock = vi.fn(async () => ({
    ok: true,
    data: { item: { id: '1' } },
}));
vi.mock('../../../lib/resource-submit', () => ({
    submitResource: (...args) => submitResourceMock(...args),
}));
import { defineWizard } from './define-wizard';
import { Wizard } from './wizard';
afterEach(() => {
    cleanup();
    submitResourceMock.mockClear();
});
const cfg = defineWizard({
    resource: 'x',
    steps: ['a', 'b'],
    registry: {
        a: { key: 'a', label: 'Passo A', Component: () => _jsx("p", { children: "conteudo A" }) },
        b: { key: 'b', label: 'Passo B', Component: () => _jsx("p", { children: "conteudo B" }) },
    },
});
describe('<Wizard>', () => {
    it('renderiza o primeiro step e o chrome, sem fullscreen', () => {
        const { container } = render(_jsx(Wizard, { config: cfg, mode: "create", entities: {}, initialResourceId: null }));
        expect(screen.queryByText('conteudo A')).not.toBeNull();
        expect(screen.queryByText('conteudo B')).toBeNull();
        expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy();
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
    });
    it('passa o ctx real do hook para o step — persist não é o stub', async () => {
        const persistCfg = defineWizard({
            resource: 'x',
            steps: ['a'],
            registry: {
                a: {
                    key: 'a',
                    label: 'Passo A',
                    Component: (props) => (_jsx("button", { type: "button", onClick: () => void props.persist({ x: 1 }), children: "salvar" })),
                },
            },
        });
        render(_jsx(Wizard, { config: persistCfg, mode: "create", entities: {}, initialResourceId: null }));
        fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
        expect(submitResourceMock).toHaveBeenCalled();
    });
});
//# sourceMappingURL=wizard.test.js.map