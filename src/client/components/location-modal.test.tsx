// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LocationModal } from './location-modal';

const NAMES = [
  'Alta Floresta',
  'Barra do Garças',
  'Cáceres',
  'Campo Grande',
  'Chapada dos Guimarães',
  'Cuiabá',
  'Lucas do Rio Verde',
  'Primavera do Leste',
  'Rondonópolis',
  'Sinop',
  'Sorriso',
  'Várzea Grande',
];

const ITEMS = NAMES.map((label, i) => ({
  value: String(5100000 + i),
  label,
  stateCode: label === 'Campo Grande' ? 'MS' : 'MT',
  stateName: label === 'Campo Grande' ? 'Mato Grosso do Sul' : 'Mato Grosso',
}));

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ items: ITEMS }), { status: 200 }))
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const cityButtons = () => screen.queryAllByRole('button', { name: /– (MT|MS)$/ });

describe('LocationModal', () => {
  it('lista direto as 10 primeiras cidades, com a UF, sem passo de estado', async () => {
    render(<LocationModal open onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Alta Floresta – MT' })).toBeTruthy();
    expect(cityButtons()).toHaveLength(10);
    expect(screen.queryByText('Sorriso')).toBeNull();
    expect(screen.queryByText(/Selecione o estado/)).toBeNull();
  });

  it('busca ignora acento/caixa e procura em todas as cidades, não só nas 10', async () => {
    render(<LocationModal open onClose={() => {}} />);
    await screen.findByRole('button', { name: 'Alta Floresta – MT' });
    fireEvent.change(screen.getByPlaceholderText('Buscar cidade...'), {
      target: { value: 'VARZEA' },
    });
    expect(cityButtons().map((b) => b.getAttribute('aria-label'))).toEqual(['Várzea Grande – MT']);
  });

  it('escolher uma cidade salva o local e fecha', async () => {
    const onClose = vi.fn();
    render(<LocationModal open onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Campo Grande – MS' }));
    expect(JSON.parse(localStorage.getItem('user_location') ?? '{}')).toEqual({
      stateCode: 'MS',
      stateName: 'Mato Grosso do Sul',
      cityId: 5100003,
      cityName: 'Campo Grande',
      source: 'manual',
    });
    expect(onClose).toHaveBeenCalled();
  });
});
