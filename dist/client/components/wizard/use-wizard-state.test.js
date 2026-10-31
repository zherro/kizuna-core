// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { defineWizard } from './define-wizard';
import { useWizardState } from './use-wizard-state';
const submitResource = vi.fn();
vi.mock('../../../lib/resource-submit', () => ({
    submitResource: (...a) => submitResource(...a),
}));
const step = (key, extra = {}) => ({
    key,
    label: key,
    Component: () => null,
    ...extra,
});
function makeConfig(over = {}) {
    return defineWizard({
        resource: 'x',
        steps: ['a', 'b', 'c'],
        registry: {
            a: step('a', { canContinue: (c) => (c.state.name ?? '').length >= 2 }),
            b: step('b', { persist: vi.fn(async () => { }) }),
            c: step('c'),
        },
        ...over,
    });
}
afterEach(() => cleanup());
describe('useWizardState', () => {
    it('goContinue bloqueia quando canContinue é falso', async () => {
        const { result } = renderHook(() => useWizardState({
            config: makeConfig(),
            mode: 'create',
            entities: {},
            initialState: { name: '' },
            initialResourceId: null,
        }));
        await act(async () => {
            await result.current.goContinue();
        });
        expect(result.current.currentIndex).toBe(0);
    });
    it('goContinue roda persist e avança', async () => {
        const cfg = makeConfig();
        const { result } = renderHook(() => useWizardState({
            config: cfg,
            mode: 'edit',
            entities: {},
            initialState: { name: 'ok' },
            initialResourceId: '1',
        }));
        await act(async () => {
            await result.current.goContinue();
        }); // a -> b
        await act(async () => {
            await result.current.goContinue();
        }); // b -> c, roda persist de b
        expect(result.current.currentIndex).toBe(2);
        expect(cfg.registry.b.persist).toHaveBeenCalled();
    });
    it('initialRecord hidrata o baseline do persister (edit não reseta colunas)', async () => {
        submitResource.mockReset();
        submitResource.mockResolvedValue({
            ok: true,
            data: { item: { id: '7', status: 'active', description: 'D', title: 'novo' } },
        });
        const cfg = makeConfig({
            registry: {
                a: step('a', {
                    persist: async (c) => {
                        await c.persist({ title: 'novo' });
                    },
                }),
                b: step('b'),
                c: step('c'),
            },
        });
        const { result } = renderHook(() => useWizardState({
            config: cfg,
            mode: 'edit',
            entities: {},
            initialState: { name: 'ok' },
            initialResourceId: '7',
            initialRecord: { id: '7', status: 'active', description: 'D' },
        }));
        await act(async () => {
            await result.current.goContinue();
        });
        const call = submitResource.mock.calls[0][0];
        const payload = call.toPayload(call.values);
        expect(payload).toMatchObject({ status: 'active', description: 'D', title: 'novo' });
    });
    it('ctx.persist resolve com { ok, item } quando submitResource devolve o registro', async () => {
        submitResource.mockReset();
        submitResource.mockResolvedValue({ ok: true, data: { item: { id: '42', title: 'novo' } } });
        let persistResult;
        const cfg = makeConfig({
            registry: {
                a: step('a', {
                    persist: async (c) => {
                        persistResult = await c.persist({ title: 'novo' });
                    },
                }),
                b: step('b'),
                c: step('c'),
            },
        });
        const { result } = renderHook(() => useWizardState({
            config: cfg,
            mode: 'edit',
            entities: {},
            initialState: { name: 'ok' },
            initialResourceId: null,
        }));
        await act(async () => {
            await result.current.goContinue();
        });
        expect(persistResult).toEqual({ ok: true, item: { id: '42', title: 'novo' } });
    });
    it('jumpTo não passa de furthestIndex', async () => {
        const { result } = renderHook(() => useWizardState({
            config: makeConfig(),
            mode: 'create',
            entities: {},
            initialState: { name: 'ok' },
            initialResourceId: '1',
        }));
        await act(async () => {
            await result.current.jumpTo(2);
        });
        expect(result.current.currentIndex).toBe(0); // furthest ainda é 0
    });
});
//# sourceMappingURL=use-wizard-state.test.js.map