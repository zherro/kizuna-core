// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { FormRenderer } from './FormRenderer';
import { collectOutput } from './validate';
import { NON_DISPLAY_TYPES, createField, type FormField, type FormSchema, type FormValues } from './types';
import {
  buildServiceRefSearchBodies,
  buildServiceRefSearchBody,
  humanizeServiceRefValue,
  pickServiceRefOptions,
  resolveServiceRefValue,
} from './service-ref';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const refField = (over: Partial<FormField> = {}): FormField => ({
  id: 'local_ref',
  key: 'local_ref',
  name: 'local_ref',
  type: 'service-ref',
  label: 'Local',
  grid: {},
  behavior: {},
  validation: {},
  appearance: {},
  serviceRef: { groupSlug: 'compras-e-feiras', categorySlugs: ['shoppings-e-lojas'] },
  ...over,
});

const row = (uid: string, title: string, category_slug: string, city: string | null = 'Cuiabá') => ({
  uid,
  title,
  category_slug,
  category_group_slug: 'compras-e-feiras',
  city,
});

describe('service-ref helpers', () => {
  it('builds the search body from the filter and the typed text', () => {
    const body = buildServiceRefSearchBody({ groupSlug: 'compras-e-feiras' }, '  pantanal ');
    expect(body.p_group_category_slug).toBe('compras-e-feiras');
    expect(body.p_query).toBe('pantanal');
    expect(body.p_state).toBeNull();
    expect(body.p_city_ibge).toBeNull();
    expect(body.p_page).toBe(0);
    expect(body.p_page_size).toBeGreaterThan(0);
  });

  it('sends no group and no query when absent', () => {
    const body = buildServiceRefSearchBody(undefined, '   ');
    expect(body.p_group_category_slug).toBeNull();
    expect(body.p_query).toBeNull();
  });

  it('keeps only the allowed categories and maps title + city', () => {
    const opts = pickServiceRefOptions(
      [row('a', 'Pantanal Shopping', 'shoppings-e-lojas'), row('b', 'Feira', 'feiras'), row('c', 'Goiabeiras', 'shoppings-e-lojas', null)],
      { categorySlugs: ['shoppings-e-lojas'] }
    );
    expect(opts).toEqual([
      { uid: 'a', title: 'Pantanal Shopping', city: 'Cuiabá' },
      { uid: 'c', title: 'Goiabeiras', city: null },
    ]);
  });

  it('keeps everything without categorySlugs and drops rows without uid', () => {
    const opts = pickServiceRefOptions([row('a', 'A', 'x'), { title: 'sem uid' }], {});
    expect(opts.map((o) => o.uid)).toEqual(['a']);
  });
});

const json = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });

describe('service-ref across groups', () => {
  it('one search body per group (groupSlugs + legacy groupSlug), none = one ungrouped body', () => {
    const bodies = buildServiceRefSearchBodies(
      { groupSlug: 'compras-e-feiras', groupSlugs: ['familia-e-criancas', 'compras-e-feiras'] },
      'casa'
    );
    expect(bodies.map((b) => b.p_group_category_slug)).toEqual(['compras-e-feiras', 'familia-e-criancas']);
    expect(buildServiceRefSearchBodies({ categorySlugs: ['x'] }, 'casa').map((b) => b.p_group_category_slug)).toEqual([null]);
  });
});

describe('resolveServiceRefValue', () => {
  const UID = '3f1c2b9a-1111-4222-8333-444455556666';

  it('looks a uid up by uid and the city through the search', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/api/resources/services?')
        ? json({ items: [{ id: 1, uid: UID, title: 'Arena Pantanal' }] })
        : json({ items: [row(UID, 'Arena Pantanal', 'jogos-e-estadios')] })
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await resolveServiceRefValue(UID)).toEqual({ uid: UID, title: 'Arena Pantanal', city: 'Cuiabá' });
    const first = new URL(String(fetchMock.mock.calls[0][0]), 'http://x');
    expect(first.searchParams.get('filter.uid')).toBe(UID);
  });

  it('looks a code up by extras.codigo', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('/api/resources/services?')
        ? json({ items: [{ id: 2, uid: 'u-2', title: 'Espaço Art' }] })
        : json({ items: [] })
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await resolveServiceRefValue('espaco-art')).toEqual({ uid: 'u-2', title: 'Espaço Art', city: null });
    const first = new URL(String(fetchMock.mock.calls[0][0]), 'http://x');
    expect(first.searchParams.get('filter.extras->>codigo')).toBe('espaco-art');
  });

  it('returns null when nothing is found or the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [] })));
    expect(await resolveServiceRefValue('nada')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    expect(await resolveServiceRefValue('nada')).toBeNull();
  });

  it('humanizes a code', () => {
    expect(humanizeServiceRefValue('espaco-art-festas')).toBe('Espaco art festas');
  });
});

describe('service-ref type', () => {
  it('is a value type (kept in the output) but not for read display', () => {
    const schema: FormSchema = { title: '', fields: [refField()] };
    expect(collectOutput(schema, { local_ref: 'u-1' })).toEqual({ local_ref: 'u-1' });
    expect(NON_DISPLAY_TYPES.has('service-ref')).toBe(true);
    expect(NON_DISPLAY_TYPES.has('hidden')).toBe(true);
    expect(NON_DISPLAY_TYPES.has('heading')).toBe(true);
    expect(NON_DISPLAY_TYPES.has('text')).toBe(false);
  });

  it('createField starts with an empty filter', () => {
    expect(createField('service-ref').serviceRef).toEqual({});
  });
});

function Harness({ field, initial = {}, onValues }: { field: FormField; initial?: FormValues; onValues?: (v: FormValues) => void }) {
  const [values, setValues] = useState<FormValues>(initial);
  return (
    <FormRenderer
      schema={{ title: '', fields: [field] }}
      values={values}
      widthOverride={1280}
      onChange={(v) => {
        setValues(v);
        onValues?.(v);
      }}
    />
  );
}

describe('FormRenderer service-ref', () => {
  it('searches active ads, shows title + city and stores the uid', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ items: [row('u-1', 'Pantanal Shopping', 'shoppings-e-lojas'), row('u-2', 'Feira', 'feiras')] }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    let last: FormValues = {};
    render(<Harness field={refField()} onValues={(v) => (last = v)} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pantanal' } });
    const option = await screen.findByRole('option', { name: /Pantanal Shopping/ });
    expect(option.textContent).toContain('Cuiabá');
    expect(screen.queryByRole('option', { name: /Feira/ })).toBeNull();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/resources/fn_search_services');
    expect(JSON.parse(String(init.body)).p_query).toBe('pantanal');

    fireEvent.click(option);
    expect(last.local_ref).toBe('u-1');
    expect(screen.getByText('Pantanal Shopping')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Remover vínculo'));
    expect(last.local_ref).toBeUndefined();
  });

  it('resolves a saved code to title + city', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.startsWith('/api/resources/services?')
          ? json({ items: [{ id: 2, uid: 'u-2', title: 'Espaço Art' }] })
          : json({ items: [row('u-2', 'Espaço Art', 'passeios-em-familia', 'Várzea Grande')] })
      )
    );
    render(<Harness field={refField()} initial={{ local_ref: 'espaco-art' }} />);
    expect(await screen.findByText('Espaço Art')).toBeTruthy();
    expect(screen.getByText('Várzea Grande')).toBeTruthy();
  });

  it('shows the readable value when the saved one is not found', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [] })));
    render(<Harness field={refField()} initial={{ local_ref: 'casa-sumida' }} />);
    expect(await screen.findByText('Casa sumida')).toBeTruthy();
  });
});
