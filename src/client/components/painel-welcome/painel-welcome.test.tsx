// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import type { LikedItem } from '../swipe/swipe-types';

vi.mock('next/link', () => ({
  default: (p: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={p.href} className={p.className}>
      {p.children}
    </a>
  ),
}));
vi.mock('../swipe/swipe-api', () => ({ fetchLiked: vi.fn(async () => []) }));

import { PainelWelcome, firstName } from './painel-welcome';

const liked = (n: number, extra: Partial<LikedItem> = {}): LikedItem => ({
  uid: `uid-${n}`,
  title: `Anúncio ${n}`,
  price: null,
  price_type: 'quote',
  category: n % 2 ? 'Eventos' : 'Passeios',
  cover_file_id: `file-${n}`,
  liked_at: `2026-10-${String(10 + n).padStart(2, '0')}T10:00:00Z`,
  ...extra,
});

afterEach(cleanup);

describe('firstName', () => {
  it('usa só o primeiro nome e ignora vazio', () => {
    expect(firstName('  Maria da Silva ')).toBe('Maria');
    expect(firstName('Cleiton')).toBe('Cleiton');
    expect(firstName('   ')).toBeNull();
    expect(firstName(null)).toBeNull();
    expect(firstName(undefined)).toBeNull();
  });
});

describe('PainelWelcome', () => {
  it('cumprimenta pelo primeiro nome no único h1', async () => {
    render(<PainelWelcome name="Maria da Silva" fetchLikedItems={async () => []} />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Bora, Maria?');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
  });

  it('sem nome usa a saudação sem nome', async () => {
    render(<PainelWelcome name={null} fetchLikedItems={async () => []} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bora descobrir?');
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
  });

  it('headingAs="h2" tira o h1 da tela', async () => {
    render(<PainelWelcome name="Ana" headingAs="h2" fetchLikedItems={async () => []} />);
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 2, name: 'Bora, Ana?' })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
  });

  it('mostra o esqueleto até os favoritos chegarem', async () => {
    let release!: (v: LikedItem[]) => void;
    const pending = new Promise<LikedItem[]>((r) => {
      release = r;
    });
    const { container } = render(<PainelWelcome fetchLikedItems={() => pending} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText(/Nada salvo ainda/)).toBeNull();
    release([]);
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('vazio mostra o convite com botão para o swipe e sem "Ver todos"', async () => {
    render(<PainelWelcome discoverHref="/descobrir" fetchLikedItems={async () => []} />);
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
    const section = screen.getByRole('heading', { level: 2, name: 'Seus favoritos' }).closest('section')!;
    const cta = within(section).getByRole('link', { name: /Ir para o swipe/ });
    expect(cta.getAttribute('href')).toBe('/descobrir');
    expect(within(section).queryByText('Ver todos')).toBeNull();
  });

  it('com itens renderiza links /anuncios/{uid}, título, categoria e "Ver todos"', async () => {
    const fetchLikedItems = vi.fn(async () => [liked(1), liked(2), liked(3)]);
    render(<PainelWelcome likedHref="/painel/favoritos" fetchLikedItems={fetchLikedItems} />);
    await waitFor(() => expect(screen.getByText('Anúncio 1')).toBeTruthy());

    expect(fetchLikedItems).toHaveBeenCalledWith(1, 12);
    for (const n of [1, 2, 3]) {
      const link = screen.getByText(`Anúncio ${n}`).closest('a')!;
      expect(link.getAttribute('href')).toBe(`/anuncios/uid-${n}`);
    }
    expect(screen.getAllByText('Eventos').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nada salvo ainda/)).toBeNull();

    const section = screen.getByRole('heading', { level: 2, name: 'Seus favoritos' }).closest('section')!;
    expect(within(section).getByRole('link', { name: 'Ver todos' }).getAttribute('href')).toBe('/painel/favoritos');
  });

  it('as capas mais recentes viram o baralho do hero', async () => {
    const { container } = render(
      <PainelWelcome fetchLikedItems={async () => [liked(1), liked(2), liked(3), liked(4)]} />
    );
    await waitFor(() => expect(screen.getByText('Anúncio 1')).toBeTruthy());
    const deck = container.querySelector('section [aria-hidden="true"].sm\\:block')!;
    const srcs = Array.from(deck.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    expect(srcs).toHaveLength(3);
    expect(srcs.sort()).toEqual([
      '/api/public/storage/files/file-1/content?size=thumb',
      '/api/public/storage/files/file-2/content?size=thumb',
      '/api/public/storage/files/file-3/content?size=thumb',
    ]);
  });

  it('advertise ausente não renderiza o convite; presente usa o texto padrão e o rótulo', async () => {
    const { rerender } = render(<PainelWelcome fetchLikedItems={async () => []} />);
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
    expect(screen.queryByText('Tem um negócio, evento ou serviço?')).toBeNull();

    rerender(
      <PainelWelcome
        fetchLikedItems={async () => []}
        advertise={{ href: '/painel/meus-servicos/novo', label: 'Novo anúncio' }}
      />
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Tem um negócio, evento ou serviço?' })).toBeTruthy();
    expect(screen.getByText('Divulgue para quem está procurando na cidade.')).toBeTruthy();
    const cta = screen.getByRole('link', { name: 'Novo anúncio' });
    expect(cta.getAttribute('href')).toBe('/painel/meus-servicos/novo');
  });

  it('erro no fetch (ex.: 401) não quebra: cai no estado vazio e o resto segue montado', async () => {
    const fetchLikedItems = vi.fn(async () => {
      throw new Error('liked_services 401');
    });
    render(<PainelWelcome name="Ana" fetchLikedItems={fetchLikedItems} />);
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
    expect(screen.getByRole('link', { name: /Descobrir no swipe/ }).getAttribute('href')).toBe('/descobrir');
    expect(screen.getByRole('link', { name: /Pesquisar/ }).getAttribute('href')).toBe('/busca');
  });

  it('atalhos apontam para os destinos configurados', async () => {
    render(
      <PainelWelcome
        likedHref="/f"
        searchHref="/s"
        accountHref="/c"
        discoverHref="/d"
        fetchLikedItems={async () => []}
      />
    );
    await waitFor(() => expect(screen.getByText(/Nada salvo ainda/)).toBeTruthy());
    const nav = screen.getByRole('navigation', { name: 'Atalhos do painel' });
    expect(within(nav).getByRole('link', { name: /Meus favoritos/ }).getAttribute('href')).toBe('/f');
    expect(within(nav).getByRole('link', { name: /Buscar na cidade/ }).getAttribute('href')).toBe('/s');
    expect(within(nav).getByRole('link', { name: /Meu perfil/ }).getAttribute('href')).toBe('/c');
  });
});
