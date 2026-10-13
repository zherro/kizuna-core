// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ServiceDetailEvento } from './service-detail-evento';
import type { ServiceDetailLabels } from './category-style';
import type { ServiceRecord } from '../service-type';

afterEach(cleanup);

const service = { id: '1', uid: 'ev1', title: 'Show', startingPrice: 0, priceUnit: 'quote' } as ServiceRecord;
const labels = { about: 'Sobre' } as ServiceDetailLabels;
const extraFields = {
  schema: { title: 'e', fields: [] },
  answers: { realizador: 'Produtora Foo', data_inicio: '2026-12-01T20:00:00' },
} as never;

const renderEvento = (organizer?: { uid: string; title: string; href: string } | null) =>
  render(
    <>
      {ServiceDetailEvento({
        service,
        extraFields,
        subcategoryNames: [],
        hue: 200,
        labels,
        organizer,
      })}
    </>
  );

describe('ServiceDetailEvento organizador', () => {
  it('com organizer mostra "Organizado por" com link para a casa e some o realizador texto', () => {
    renderEvento({ uid: 'casa1', title: 'Casa X', href: '/cuiaba-mt/anuncio/casa1' });
    expect(screen.getByText('Organizado por')).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Casa X' });
    expect(link.getAttribute('href')).toBe('/cuiaba-mt/anuncio/casa1');
    expect(screen.queryByText('Realização')).toBeNull();
    expect(screen.queryByText('Produtora Foo')).toBeNull();
  });

  it.each([[undefined], [null]])('sem organizer (%s) mantém o realizador como texto', (organizer) => {
    renderEvento(organizer);
    expect(screen.getByText('Realização')).toBeTruthy();
    expect(screen.getByText('Produtora Foo')).toBeTruthy();
    expect(screen.queryByText('Organizado por')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
