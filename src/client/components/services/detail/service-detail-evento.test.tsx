// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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

  it('o local tem "Ver localização" abrindo o mapa', () => {
    renderEvento(null, { venue, extraFields: extraWithAddress });
    const map = screen.getByRole('link', { name: /Ver localização/ });
    expect(map.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/search\//);
    expect(decodeURIComponent(map.getAttribute('href')!)).toContain('Casa X');
    expect(map.getAttribute('target')).toBe('_blank');
  });

  it('sem venue mantém a seção Local do endereço', () => {
    renderEvento(null, { venue: null, extraFields: extraWithAddress });
    expect(screen.queryByText('Onde acontece')).toBeNull();
    expect(screen.getByText('Local')).toBeTruthy();
  });

  it('organizador igual ao local não duplica o link', () => {
    renderEvento({ uid: 'casa1', title: 'Casa X', href: '/cuiaba-mt/anuncio/casa1' }, { venue });
    const toVenue = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/cuiaba-mt/anuncio/casa1');
    expect(toVenue).toHaveLength(1);
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
    // (a barra fixa do celular também tem um "Comprar ingresso": olha só a seção)
    expect(within(screen.getByText('Ingressos').closest('section')!).getByText('Comprar ingresso')).toBeTruthy();
  });

  it('sem salePoints resolvidos, lê {nome, link} e string pura do formulário', () => {
    const raw = {
      ...extraFields,
      answers: { ...extraFields.answers, pontos_de_venda: [{ nome: 'Disk ingresso', link: 'https://disk.test/e' }, 'Bilheteria'] },
    } as never;
    renderEvento(null, { extraFields: raw });
    // "Disk ingresso" não é lugar cadastrado: o link vai para baixo dos ingressos
    expect(screen.getByRole('link', { name: /Comprar em Disk ingresso/ }).getAttribute('href')).toBe('https://disk.test/e');
    expect(screen.queryByText(/Bora comprar ingresso/)).toBeNull();
    expect(screen.getByText('Bilheteria')).toBeTruthy();
  });

  it('lugar não achado com link: sem card em "Onde comprar", link de compra abaixo dos ingressos', () => {
    const raw = {
      ...extraFields,
      answers: { ...extraFields.answers, ingressos: [{ setor: 'PISTA', valor: 50 }] },
    } as never;
    renderEvento(null, {
      extraFields: raw,
      salePoints: [
        { label: 'Casa de Festas', venue: { ...venue, title: 'Casa de Festas' } },
        { label: '', venue: null, link: 'https://compra.test/x' },
      ],
    });
    const buy = within(screen.getByText('PISTA').closest('section')!).getByRole('link', { name: 'Comprar ingresso' });
    expect(buy.getAttribute('href')).toBe('https://compra.test/x');
    expect(buy.getAttribute('target')).toBe('_blank');
    // fica na seção Ingressos (depois do card do ingresso), não em "Onde comprar"
    const ingressos = screen.getByText('PISTA').closest('section');
    expect(ingressos?.contains(buy)).toBe(true);
    expect(screen.getByText('Onde comprar')).toBeTruthy();
  });

  it('só ponto sem lugar com link: "Onde comprar" some e a seção Ingressos aparece com o link', () => {
    renderEvento(null, { salePoints: [{ label: '', venue: null, link: 'https://compra.test/x' }] });
    expect(screen.queryByText('Onde comprar')).toBeNull();
    expect(screen.getByText('Ingressos')).toBeTruthy();
    const ingressos = within(screen.getByText('Ingressos').closest('section')!);
    expect(ingressos.getByRole('link', { name: 'Comprar ingresso' }).getAttribute('href')).toBe('https://compra.test/x');
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

describe('ServiceDetailEvento — "Acontece em" (expires_at)', () => {
  const renderWithExpiry = (expiresAt: string) =>
    render(
      <>
        {ServiceDetailEvento({
          service: { ...service, expiresAt } as ServiceRecord,
          extraFields,
          subcategoryNames: [],
          hue: 200,
          labels,
        })}
      </>
    );

  it('sem hora: só o dia', () => {
    renderWithExpiry('2026-12-20T03:59:59.999Z'); // 19/12 fim do dia em Cuiabá
    expect(screen.getByText('Acontece em')).toBeTruthy();
    expect(screen.getByText(/19 de dez/)).toBeTruthy();
    expect(screen.queryByText(/até \d{2}:\d{2}/)).toBeNull();
  });

  it('com hora de início: "· HH:MM"', () => {
    renderWithExpiry('2026-12-20T02:00:00.000Z'); // 19/12 22:00 em Cuiabá
    expect(screen.getByText(/19 de dez.* · 22:00/)).toBeTruthy();
  });
});

describe('ServiceDetailEvento barra fixa de compra', () => {
  const bar = () => screen.queryByRole('region', { name: 'Comprar ingresso' });
  const withAnswers = (answers: Record<string, unknown>) =>
    ({ ...extraFields, answers: { ...extraFields.answers, ...answers } }) as never;

  it('com link e WhatsApp: "Comprar ingresso" (purchase) principal e WhatsApp secundário, com o preço', () => {
    renderEvento(null, {
      extraFields: withAnswers({
        link_ingresso: 'https://compra.test/x',
        contato_whatsapp: '(65) 99999-0000',
        ingressos: [{ setor: 'PISTA', valor: 50 }],
      }),
    });
    const b = within(bar()!);
    expect(b.getByRole('link', { name: /Comprar ingresso/ }).getAttribute('href')).toBe('https://compra.test/x');
    expect(b.getByRole('link', { name: 'Chamar no WhatsApp' }).getAttribute('href')).toBe('https://wa.me/5565999990000');
    expect(b.getByText('A partir de')).toBeTruthy();
  });

  it('só WhatsApp (inclusive o da linha "Como comprar" da descrição): vira a ação principal', () => {
    render(
      <>
        {ServiceDetailEvento({
          service: { ...service, description: '- **Como comprar:** WhatsApp (65) 9.9953-1935' },
          extraFields,
          subcategoryNames: [],
          hue: 200,
          labels,
        })}
      </>
    );
    const link = within(bar()!).getByRole('link', { name: /Chamar no WhatsApp/ });
    expect(link.getAttribute('href')).toBe('https://wa.me/5565999531935');
    expect(within(bar()!).queryByText(/Comprar ingresso/)).toBeNull();
  });

  it('sem forma de comprar: sem barra', () => {
    renderEvento(null);
    expect(bar()).toBeNull();
  });

  it('evento encerrado: sem barra', () => {
    renderEvento(null, { extraFields: withAnswers({ data_inicio: '2020-01-01T20:00', link_ingresso: 'https://compra.test/x' }) });
    expect(bar()).toBeNull();
  });
});

describe('ServiceDetailEvento ingressos agrupados', () => {
  const ingressos = [
    { setor: 'PISTA', tipo: 'Inteira', valor: 60 },
    { setor: 'PISTA', tipo: 'Meia', valor: 30 },
    { setor: 'CAMAROTE', valor: 400, pessoas: 10 },
    { setor: 'MESA OURO', valor: 1200 },
    { setor: 'MESA PRATA', valor: 1000 },
    { setor: 'MESA BRONZE', valor: 800 },
    { setor: 'MESA SAFIRA', valor: 600 },
    { setor: 'MESA DIAMANTE', valor: 1500 },
  ];
  const renderTickets = () =>
    renderEvento(null, { extraFields: { ...extraFields, answers: { ...extraFields.answers, ingressos } } as never });

  it('setor como cabeçalho uma vez só, modalidades do mais barato ao mais caro', () => {
    renderTickets();
    expect(screen.getAllByText('PISTA')).toHaveLength(1);
    const pista = screen.getByText('PISTA').closest('li')!;
    const labels = within(pista).getAllByText(/^(Meia|Inteira)$/).map((n) => n.textContent);
    expect(labels).toEqual(['Meia', 'Inteira']);
  });

  it('passando de 6 linhas, o resto fica no "Ver mais"', () => {
    renderTickets();
    const summary = screen.getByText(/Ver mais 2 ingressos/);
    const details = summary.closest('details')!;
    expect(details.hasAttribute('open')).toBe(false);
    expect(within(details).getByText('MESA DIAMANTE')).toBeTruthy();
    expect(within(details).getByText('MESA OURO')).toBeTruthy();
  });
});
