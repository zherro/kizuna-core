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
  extra: { artists?: { label: string; venue: Venue | null }[] | null; salePoints?: { label: string; venue: Venue | null; link?: string }[] | null; venue?: Venue | null; renderVenueCard?: (ctx: { venue: Venue }) => React.ReactNode; extraFields?: never } = {}
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

describe('ServiceDetailEvento onde comprar: botão de compra', () => {
  const comLinkGeral = { ...extraFields, answers: { ...extraFields.answers, link_ingresso: 'https://geral.test/e' } } as never;

  it('ponto com link http(s) mostra "Bora comprar ingresso" em nova aba; sem link não mostra', () => {
    renderEvento(null, {
      salePoints: [
        { label: 'Casa de Festas', venue: { ...venue, title: 'Casa de Festas' }, link: 'https://ingressos.test/show' },
        { label: 'Disk ingresso', venue: null },
      ],
    });
    const btns = screen.getAllByRole('link', { name: /Bora comprar ingresso/ });
    expect(btns).toHaveLength(1);
    expect(btns[0].getAttribute('href')).toBe('https://ingressos.test/show');
    expect(btns[0].getAttribute('target')).toBe('_blank');
    expect(btns[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('Disk ingresso')).toBeTruthy();
    expect(screen.getByText('Cuiabá')).toBeTruthy();
  });

  it('link inválido (javascript:) é ignorado', () => {
    renderEvento(null, { salePoints: [{ label: 'X', venue: null, link: 'javascript:alert(1)' }] });
    expect(screen.queryByText(/Bora comprar ingresso/)).toBeNull();
  });

  it('link_ingresso geral não vira botão em ponto sem link próprio', () => {
    renderEvento(null, {
      extraFields: comLinkGeral,
      salePoints: [{ label: 'Disk ingresso', venue: null }],
    });
    expect(screen.queryByText(/Bora comprar ingresso/)).toBeNull();
    expect(screen.getByText('Comprar ingresso')).toBeTruthy();
  });

  it('sem salePoints resolvidos, lê {nome, link} e string pura do formulário', () => {
    const raw = {
      ...extraFields,
      answers: { ...extraFields.answers, pontos_de_venda: [{ nome: 'Disk ingresso', link: 'https://disk.test/e' }, 'Bilheteria'] },
    } as never;
    renderEvento(null, { extraFields: raw });
    expect(screen.getByRole('link', { name: /Bora comprar ingresso/ }).getAttribute('href')).toBe('https://disk.test/e');
    expect(screen.getByText('Bilheteria')).toBeTruthy();
  });
});

describe('ServiceDetailEvento cidade junto do local', () => {
  const comEndereco = {
    ...extraFields,
    answers: { ...extraFields.answers, endereco: 'Teatro Y — Rua B, 5, Centro, Cuiabá/MT' },
  } as never;

  it('venue sem cityName usa a cidade do endereço do evento', () => {
    renderEvento(null, { extraFields: comEndereco, venue: { ...venue, cityName: null } });
    expect(screen.getByText('Cuiabá/MT')).toBeTruthy();
  });

  it('venue com cityName não duplica a cidade do endereço', () => {
    renderEvento(null, { extraFields: comEndereco, venue });
    expect(screen.getByText('Cuiabá')).toBeTruthy();
    expect(screen.queryByText('Cuiabá/MT')).toBeNull();
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
