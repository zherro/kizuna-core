import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
const submitResourceMock = vi.fn(async () => ({ ok: true, data: { item: { id: '1' } } }));
vi.mock('../../../lib/resource-submit', () => ({
    submitResource: (...args) => submitResourceMock(...args),
}));
import { Wizard } from './wizard';
import { defineWizard } from './define-wizard';
const config = defineWizard({
    resource: 'x',
    registry: {
        a: {
            key: 'a',
            label: 'A',
            Component: () => _jsx("div", { children: "step-a" }),
            canContinue: () => true,
            assist: true,
        },
        b: { key: 'b', label: 'B', Component: () => _jsx("div", { children: "step-b" }) },
    },
    steps: ['a', 'b'],
});
const adapter = (status) => ({
    status,
    greeting: 'oi',
    converse: vi.fn(),
});
afterEach(cleanup);
describe('<Wizard conversation=…>', () => {
    it('conversation ativa → renderiza o dock, não o botão one-shot', () => {
        render(_jsx(Wizard, { config: config, mode: "create", entities: {}, initialResourceId: null, initialState: { title: '' }, assistant: { status: 'ready', suggest: vi.fn(), retry: vi.fn() }, conversation: adapter('ready') }));
        expect(screen.getByTestId('navi-dock')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Preencher com IA/i })).toBeNull();
    });
    it('conversation unavailable → shell puro, sem dock', () => {
        render(_jsx(Wizard, { config: config, mode: "create", entities: {}, initialResourceId: null, initialState: { title: '' }, conversation: adapter('unavailable') }));
        expect(screen.queryByTestId('navi-dock')).toBeNull();
        expect(screen.getByText('step-a')).toBeTruthy();
    });
});
//# sourceMappingURL=wizard-conversation-wiring.test.js.map