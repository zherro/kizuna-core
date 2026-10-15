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

type Venue = { uid: string; title: string; href: string; photo: string | null; address: string | null; cityName: string | null };
const venue: Venue = { uid: 'casa1', title: 'Casa X', href: '/cuiaba-mt/anuncio/casa1', photo: null, address: 'Rua A, 10', cityName: 'Cuiabá' };
const extraWithAddress = { ...extraFields, answers: { ...extraFields.answers, endereco: 'Teatro Y - Rua B, 5' } } as never;

const renderEvento = (
  organizer?: { uid: string; title: string; href: string } | null,
  extra: { artists?: { label: string; venue: Venue | null }[] | null; salePoints?: { label: string; venue: Venue | null }[] | null; venue?: Venue | null; renderVenueCard?: (ctx: { venue: Venue }) => React.ReactNode; extraFields?: never } = {}
) =>
  render(
    <>
      {ServiceDetailEvento({
        service,
        extraFields: extra.extraFields ?? extraFields,
        subcategoryNames: [],
        hue: 200,
        labels,
        organizer,
        venue: extra.venue,
        salePoints: extra.salePoints,
        artists: extra.artists,
        renderVenueCard: extra.renderVenueCard,
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

describe('ServiceDetailEvento venue', () => {
  it('com venue mostra "Onde acontece" no lugar da seção Local', () => {
    renderEvento(null, { venue, extraFields: extraWithAddress });
    expect(screen.getByText('Onde acontece')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Casa X/ }).getAttribute('href')).toBe('/cuiaba-mt/anuncio/casa1');
    expect(screen.queryByText('Local')).toBeNull();
  });

  it('sem venue mantém a seção Local do endereço', () => {
    renderEvento(null, { venue: null, extraFields: extraWithAddress });
    expect(screen.queryByText('Onde acontece')).toBeNull();
    expect(screen.getByText('Local')).toBeTruthy();
  });

  it('organizador igual ao local não duplica o link', () => {
    renderEvento({ uid: 'casa1', title: 'Casa X', href: '/cuiaba-mt/anuncio/casa1' }, { venue });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText('Organizado por')).toBeNull();
    expect(screen.getByText('Realização')).toBeTruthy();
  });

  it('renderVenueCard do slot substitui o card padrão', () => {
    renderEvento(null, { venue, renderVenueCard: ({ venue: v }) => <p>custom {v.title}</p> });
    expect(screen.getByText('custom Casa X')).toBeTruthy();
    expect(screen.queryByText('Onde acontece')).toBeNull();
  });
});

describe('ServiceDetailEvento onde comprar', () => {
  const withRaw = { ...extraFields, answers: { ...extraFields.answers, pontos_de_venda: [{ nome: 'casa-de-festas-cuiaba' }] } } as never;

  it('ponto com venue vira link para o local; sem venue fica o label', () => {
    renderEvento(null, {
      extraFields: withRaw,
      salePoints: [
        { label: 'casa-de-festas-cuiaba', venue: { ...venue, title: 'Casa de Festas' } },
        { label: 'Bilheteria do teatro', venue: null },
      ],
    });
    expect(screen.getByRole('link', { name: /Casa de Festas/ }).getAttribute('href')).toBe('/cuiaba-mt/anuncio/casa1');
    expect(screen.getByText('Bilheteria do teatro')).toBeTruthy();
    expect(screen.queryByText('casa-de-festas-cuiaba')).toBeNull();
  });

  it('sem salePoints usa o texto cru de pontos_de_venda', () => {
    renderEvento(null, { extraFields: withRaw });
    expect(screen.getByText('casa-de-festas-cuiaba')).toBeTruthy();
  });
});

describe('ServiceDetailEvento artistas', () => {
  const withArtists = { ...extraFields, answers: { ...extraFields.answers, artistas: [{ nome: 'Banda Z' }] } } as never;

  it('sem artists resolvidos, o nome leva à busca', () => {
    renderEvento(null, { extraFields: withArtists });
    expect(screen.getByRole('link', { name: 'Banda Z' }).getAttribute('href')).toBe('/busca?q=Banda%20Z');
  });

  it('artista resolvido leva ao anúncio dele', () => {
    renderEvento(null, {
      extraFields: withArtists,
      artists: [{ label: 'banda-z', venue: { ...venue, uid: 'bz', title: 'Banda Z', href: '/cuiaba-mt/anuncio/bz' } }],
    });
    expect(screen.getByRole('link', { name: 'Banda Z' }).getAttribute('href')).toBe('/cuiaba-mt/anuncio/bz');
  });
});
