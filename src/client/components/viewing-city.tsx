'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { UserLocation } from '../hooks/use-user-location';

/**
 * Cidade "em exibição": a que a URL está mostrando (ex.: `/varzea-grande-mt/anuncio/x`),
 * que pode diferir da cidade salva do usuário. O `LocationTrigger` mostra esta no topo e o
 * `LocationModal` entra em modo de confirmação quando ela difere da salva. Sem provider/marcador
 * nada muda: `useViewingCity()` devolve `null`.
 */

export type ViewingCity = {
  cityId: number;
  cityName: string;
  stateCode: string;
  stateName: string;
};

type Entry = { city: ViewingCity; onConfirm?: (loc: UserLocation) => void };
type Ctx = { entry: Entry | null; setEntry: (entry: Entry | null) => void };

const ViewingCityContext = createContext<Ctx>({ entry: null, setEntry: () => {} });

export function ViewingCityProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const value = useMemo(() => ({ entry, setEntry }), [entry]);
  return <ViewingCityContext.Provider value={value}>{children}</ViewingCityContext.Provider>;
}

export function useViewingCity(): ViewingCity | null {
  return useContext(ViewingCityContext).entry?.city ?? null;
}

/** Chamado pelo seletor depois de gravar uma cidade (qualquer modo) enquanto há cidade em exibição. */
export function useViewingCityConfirm(): ((loc: UserLocation) => void) | undefined {
  return useContext(ViewingCityContext).entry?.onConfirm;
}

export function ViewingCityMarker({
  city,
  onConfirm,
}: {
  city: ViewingCity;
  onConfirm?: (loc: UserLocation) => void;
}) {
  const { setEntry } = useContext(ViewingCityContext);
  const confirmRef = useRef(onConfirm);
  confirmRef.current = onConfirm;
  const { cityId, cityName, stateCode, stateName } = city;

  useEffect(() => {
    setEntry({
      city: { cityId, cityName, stateCode, stateName },
      onConfirm: (loc) => confirmRef.current?.(loc),
    });
    return () => setEntry(null);
  }, [cityId, cityName, stateCode, stateName, setEntry]);

  return null;
}
