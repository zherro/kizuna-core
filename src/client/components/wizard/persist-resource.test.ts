import { describe, expect, it, vi, beforeEach } from 'vitest';

const submitResource = vi.fn();
vi.mock('../../../lib/resource-submit', () => ({
  submitResource: (...a: unknown[]) => submitResource(...a),
}));

import { createResourcePersister } from './persist-resource';

beforeEach(() => submitResource.mockReset());

describe('createResourcePersister', () => {
  it('merge: manda baseline + overrides', async () => {
    submitResource.mockResolvedValue({
      ok: true,
      data: { item: { id: '7', status: 'pending', title: 'novo' } },
    });
    const p = createResourcePersister({ resource: 'services', resourceId: '7', onError: () => {} });
    p.setBaseline({ id: '7', status: 'pending', title: 'velho', description: 'D' });
    await p.persist({ title: 'novo' });
    const call = submitResource.mock.calls[0][0];
    const payload = call.toPayload(call.values);
    expect(payload).toMatchObject({ status: 'pending', description: 'D', title: 'novo' });
  });

  it('adota o id novo quando não havia resourceId', async () => {
    submitResource.mockResolvedValue({ ok: true, data: { item: { id: '9' } } });
    const onId = vi.fn();
    const p = createResourcePersister({
      resource: 'services',
      resourceId: null,
      onError: () => {},
      onId,
    });
    await p.persist({ title: 'x' });
    expect(onId).toHaveBeenCalledWith('9');
  });

  it('ok:false não atualiza baseline', async () => {
    submitResource.mockResolvedValue({ ok: false, data: {} });
    const p = createResourcePersister({ resource: 'services', resourceId: '1', onError: () => {} });
    p.setBaseline({ id: '1', title: 'a' });
    const r = await p.persist({ title: 'b' });
    expect(r.ok).toBe(false);
    expect(p.baseline).toEqual({ id: '1', title: 'a' });
  });

  it('persistExtras faz merge só de extras', async () => {
    submitResource.mockResolvedValue({
      ok: true,
      data: { item: { id: '1', extras: { images: ['a'] } } },
    });
    const p = createResourcePersister({ resource: 'services', resourceId: '1', onError: () => {} });
    p.setBaseline({ id: '1', extras: { foo: 1 } });
    await p.persistExtras({ images: ['a'] });
    const call = submitResource.mock.calls[0][0];
    expect(call.toPayload(call.values).extras).toEqual({ foo: 1, images: ['a'] });
  });
});
