// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

import { HomeSearch } from './home-search';

const city = { name: 'São Paulo', state: 'SP', ibge: '3550308' };
const cityQs = 'state=SP&cityId=3550308&cityName=S%C3%A3o%20Paulo';

function type(text: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: text } });
}

beforeEach(() => router.push.mockClear());
afterEach(cleanup);

describe('HomeSearch', () => {
  it('envia para /busca?q= com o texto codificado e sem espaços nas pontas', () => {
    render(<HomeSearch />);
    type('  pizza & vinho ');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(router.push).toHaveBeenCalledWith('/busca?q=pizza%20%26%20vinho');
  });

  it('acrescenta state, cityId e cityName quando vem city', () => {
    render(<HomeSearch city={city} />);
    type('pizza');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(router.push).toHaveBeenCalledWith(`/busca?q=pizza&${cityQs}`);
  });

  it('busca vazia vai para /busca sem q (com city, só a cidade)', () => {
    const { unmount } = render(<HomeSearch />);
    type('   ');
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(router.push).toHaveBeenLastCalledWith('/busca');
    unmount();
    render(<HomeSearch city={city} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(router.push).toHaveBeenLastCalledWith(`/busca?${cityQs}`);
  });

  it('sem aiEnabled não tem botão do assistente; com aiEnabled navega para ?ia=', () => {
    const { unmount } = render(<HomeSearch />);
    expect(screen.queryByLabelText('Falar com o assistente')).toBeNull();
    unmount();
    render(<HomeSearch aiEnabled city={city} />);
    type('quero um eletricista');
    fireEvent.click(screen.getByLabelText('Falar com o assistente'));
    expect(router.push).toHaveBeenCalledWith(`/busca?ia=quero%20um%20eletricista&${cityQs}`);
  });

  it('ia vazio vai para /busca; chip de localização aparece com locationLabel', () => {
    render(<HomeSearch aiEnabled locationLabel="São Paulo" />);
    expect(screen.getByText('São Paulo')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Falar com o assistente'));
    expect(router.push).toHaveBeenCalledWith('/busca');
  });

  it('contained envolve no container da home; contained=false não', () => {
    const { container, rerender } = render(<HomeSearch />);
    expect((container.firstChild as HTMLElement).className).toContain('max-w-[1600px]');
    rerender(<HomeSearch contained={false} />);
    expect((container.firstChild as HTMLElement).tagName).toBe('FORM');
  });
});
