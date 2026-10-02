// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ViewingCityMarker, ViewingCityProvider, useViewingCity } from './viewing-city';

const VG = { cityId: 5108402, cityName: 'Várzea Grande', stateCode: 'MT', stateName: 'Mato Grosso' };

function Probe() {
  const viewing = useViewingCity();
  return <p data-testid="probe">{viewing ? viewing.cityName : 'nenhuma'}</p>;
}

afterEach(cleanup);

describe('ViewingCity', () => {
  it('sem marcador não há cidade em exibição', () => {
    render(
      <ViewingCityProvider>
        <Probe />
      </ViewingCityProvider>
    );
    expect(screen.getByTestId('probe').textContent).toBe('nenhuma');
  });

  it('o marcador publica a cidade e limpa ao desmontar', () => {
    const { rerender } = render(
      <ViewingCityProvider>
        <ViewingCityMarker city={VG} />
        <Probe />
      </ViewingCityProvider>
    );
    expect(screen.getByTestId('probe').textContent).toBe('Várzea Grande');

    rerender(
      <ViewingCityProvider>
        <Probe />
      </ViewingCityProvider>
    );
    expect(screen.getByTestId('probe').textContent).toBe('nenhuma');
  });
});
