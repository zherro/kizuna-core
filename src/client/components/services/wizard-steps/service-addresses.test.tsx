// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { AddressListEditor } from './address-list-editor';
import {
  addAddress,
  diffAddresses,
  emptyServiceAddress,
  normalizePrimary,
  removeAddress,
  runLimited,
  setPrimaryAddress,
  syncServiceAddresses,
} from './service-addresses';
import type { ServiceAddress } from '../service-type';

vi.mock('../../ui-better-soft/google-form/address-google-form', () => ({
  AddressForm: ({ value }: { value?: { street?: string } }) => (
    <div data-testid="address-form">{value?.street ?? ''}</div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const full = (over: Partial<ServiceAddress> = {}): ServiceAddress => ({
  ...emptyServiceAddress(),
  zipCode: '78000000',
  street: 'Rua A',
  number: '1',
  cityIbge: '5103403',
  ...over,
});

describe('regras de principal', () => {
  it('primeiro adicionado é principal, os seguintes não; respeita o limite', () => {
    let list = addAddress([], 2);
    list = addAddress(list, 2);
    expect(list.map((a) => a.isPrimary)).toEqual([true, false]);
    expect(addAddress(list, 2)).toHaveLength(2);
  });

  it('remover a principal promove a próxima', () => {
    const [a, b, c] = [full({ clientId: 'a', isPrimary: true }), full({ clientId: 'b' }), full({ clientId: 'c' })];
    const out = removeAddress([a, b, c], 'a');
    expect(out.map((x) => [x.clientId, x.isPrimary])).toEqual([
      ['b', true],
      ['c', false],
    ]);
    // removendo a última principal promove a anterior
    const out2 = removeAddress([full({ clientId: 'a' }), full({ clientId: 'b', isPrimary: true })], 'b');
    expect(out2.map((x) => x.isPrimary)).toEqual([true]);
  });

  it('setPrimary mantém exatamente 1; normalizePrimary conserta', () => {
    const list = [full({ clientId: 'a', isPrimary: true }), full({ clientId: 'b' })];
    expect(setPrimaryAddress(list, 'b').map((x) => x.isPrimary)).toEqual([false, true]);
    expect(normalizePrimary([full({ clientId: 'a' }), full({ clientId: 'b' })]).map((x) => x.isPrimary)).toEqual([true, false]);
    expect(normalizePrimary([full({ isPrimary: true }), full({ isPrimary: true })]).filter((x) => x.isPrimary)).toHaveLength(1);
  });
});

describe('AddressListEditor', () => {
  function Harness({ max }: { max: number }) {
    const [list, setList] = useState<ServiceAddress[]>([]);
    return <AddressListEditor addresses={list} onChange={setList} maxAddresses={max} />;
  }

  it('adiciona até o limite, marca principal e remove', () => {
    render(<Harness max={2} />);
    fireEvent.click(screen.getByText('Adicionar endereço'));
    fireEvent.click(screen.getByText('Adicionar endereço'));
    expect(screen.getAllByTestId('address-form')).toHaveLength(2);
    expect(screen.queryByText('Adicionar endereço')).toBeNull();
    expect(screen.getAllByText('Principal')).toHaveLength(1);

    fireEvent.click(screen.getByText('Tornar principal'));
    expect(screen.getAllByText('Principal')).toHaveLength(1);

    fireEvent.click(screen.getAllByLabelText('Remover endereço')[0]);
    expect(screen.getAllByTestId('address-form')).toHaveLength(1);
    // sobrou 1 linha e ela é a principal
    expect(screen.getByText('Principal')).toBeTruthy();
  });
});

describe('diffAddresses', () => {
  it('só o que mudou; incompletas não são gravadas', () => {
    const kept = full({ id: '1', clientId: 'k' });
    const changed = full({ id: '2', clientId: 'c', street: 'Nova' });
    const prev = [kept, full({ id: '2', clientId: 'c' }), full({ id: '3', clientId: 'r' })];
    const added = full({ clientId: 'n' });
    const incomplete = emptyServiceAddress();
    const d = diffAddresses([kept, changed, added, incomplete], prev);
    expect(d.toDelete.map((a) => a.id)).toEqual(['3']);
    expect(d.toCreate.map((a) => a.clientId)).toEqual(['n']);
    expect(d.toUpdate.map((a) => a.id)).toEqual(['2']);
  });
});

describe('syncServiceAddresses', () => {
  let calls: Array<{ method: string; url: string; body?: Record<string, unknown> }>;
  beforeEach(() => {
    calls = [];
    let seq = 100;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        if (url.startsWith('/api/location/cep')) {
          return { ok: true, status: 200, json: async () => ({ ibge: '5103403' }) };
        }
        calls.push({
          method: init?.method ?? 'GET',
          url,
          body: init?.body ? JSON.parse(init.body) : undefined,
        });
        return { ok: true, status: 200, json: async () => ({ item: { id: String((seq += 1)) } }) };
      })
    );
  });

  it('sem mudanças não faz nenhuma requisição', async () => {
    const a = full({ id: '1' });
    const out = await syncServiceAddresses('9', [a], [a]);
    expect(calls).toHaveLength(0);
    expect(out).toEqual([a]);
  });

  it('POST novo (com ibge resolvido, sem clientId), PATCH alterado, DELETE removido', async () => {
    const keep = full({ id: '1', clientId: 'k', isPrimary: true });
    const edited = full({ id: '2', clientId: 'e', street: 'Nova' });
    const prev = [keep, full({ id: '2', clientId: 'e' }), full({ id: '3', clientId: 'r' })];
    const added = full({ clientId: 'n', cityIbge: null });
    const out = await syncServiceAddresses('9', [keep, edited, added], prev);

    const by = (m: string) => calls.filter((c) => c.method === m);
    expect(by('DELETE').map((c) => c.url)).toEqual(['/api/resources/service_addresses/3']);
    expect(by('PATCH').map((c) => c.url)).toEqual(['/api/resources/service_addresses/2']);
    expect(by('POST')).toHaveLength(1);
    const post = by('POST')[0].body!;
    expect(post.serviceId).toBe('9');
    expect(post.cityIbge).toBe('5103403');
    expect(post).not.toHaveProperty('clientId');
    expect(post).not.toHaveProperty('tenant_id');
    expect(out.find((a) => a.clientId === 'n')?.id).toBe('101');
  });

  it('troca de principal: rebaixa antes de promover (índice único)', async () => {
    const a = full({ id: '1', clientId: 'a', isPrimary: true });
    const b = full({ id: '2', clientId: 'b', isPrimary: false });
    await syncServiceAddresses(
      '9',
      [{ ...a, isPrimary: false }, { ...b, isPrimary: true }],
      [a, b]
    );
    expect(calls.map((c) => [c.url.split('/').pop(), c.body?.isPrimary])).toEqual([
      ['1', false],
      ['2', true],
    ]);
  });

  it('falha de rede lança', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    await expect(syncServiceAddresses('9', [full({ cityIbge: '1' })], [])).rejects.toThrow();
  });
});

describe('runLimited', () => {
  it('nunca passa do limite em voo', async () => {
    let inflight = 0;
    let peak = 0;
    const task = () => async () => {
      inflight += 1;
      peak = Math.max(peak, inflight);
      await new Promise((r) => setTimeout(r, 5));
      inflight -= 1;
    };
    await runLimited(Array.from({ length: 12 }, task), 5);
    expect(peak).toBeLessThanOrEqual(5);
  });
});
