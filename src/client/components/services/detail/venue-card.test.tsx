// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VenueCard } from './venue-card';

afterEach(cleanup);

const venue = {
  uid: 'casa1',
  title: 'Casa X',
  href: '/cuiaba-mt/anuncio/casa1',
  photo: 'https://img.test/casa.jpg',
  address: 'Rua A, 10',
  cityName: 'Cuiabá',
};

describe('VenueCard', () => {
  it('mostra título, endereço, cidade e foto, linkando para o local', () => {
    const { container } = render(<VenueCard venue={venue} hue={200} />);
    expect(screen.getByText('Onde acontece')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/cuiaba-mt/anuncio/casa1');
    expect(screen.getByText('Casa X')).toBeTruthy();
    expect(screen.getByText('Rua A, 10')).toBeTruthy();
    expect(screen.getByText('Cuiabá')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://img.test/casa.jpg');
  });

  it('sem foto, endereço e cidade mostra só o nome', () => {
    const { container } = render(<VenueCard venue={{ ...venue, photo: null, address: null, cityName: null }} hue={10} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByText('Rua A, 10')).toBeNull();
    expect(screen.queryByText('Cuiabá')).toBeNull();
    expect(screen.getByText('Casa X')).toBeTruthy();
  });
});
