'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
  stateCode: string;
  stateName: string;
  cityId: number;
  cityName: string;
  source: 'manual' | 'gps' | 'ip';
}

export type DetectionStatus = 'idle' | 'detecting' | 'found' | 'prompt' | 'manual';

const STORAGE_KEY = 'user_location';
const LOCATION_EVENT = 'user_location_changed';

export function getStoredLocation(): UserLocation | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

export function getStoredCityId(): string {
  const cityId = getStoredLocation()?.cityId;
  return cityId && cityId > 0 ? String(cityId) : 'all';
}

// As chamadas externas (Nominatim, ip-api) são proxiadas por rotas server-side do plugin
// `location` (`/api/location/reverse`, `/api/location/ip`, `/api/location/resolve`) — o
// navegador nunca fala direto com terceiros e as respostas ficam cacheáveis no servidor.

type ReverseGeocode = {
  stateCode: string;
  stateName: string;
  cityName: string;
};

type ResolvedLocation = Omit<UserLocation, 'source'>;

/**
 * Valida UF + cidade contra a lista de cidades do projeto (`location` do kizuna.config.json):
 * devolve a cidade da lista, a cidade padrão, ou `null` (sem local válido → abrir o seletor).
 * `undefined` = falha de rede/servidor: o chamador não deve apagar nada por causa disso.
 */
export async function resolveLocation(
  stateCode: string,
  cityName: string
): Promise<ResolvedLocation | null | undefined> {
  try {
    const qs = new URLSearchParams({ uf: stateCode, city: cityName });
    const res = await fetch(`/api/location/resolve?${qs}`);
    if (!res.ok) return undefined;
    const data = (await res.json()) as { location?: ResolvedLocation | null };
    return data.location ?? null;
  } catch {
    return undefined;
  }
}

/**
 * Local salvo no navegador pode ser de antes da lista de cidades (ex.: "São Paulo" detectado por
 * IP numa visita antiga). Revalida uma vez por carga de página — todas as instâncias do hook
 * compartilham a mesma promessa.
 */
let storedRevalidation: Promise<void> | null = null;

function revalidateStoredLocationOnce(apply: (loc: UserLocation | null) => void) {
  if (storedRevalidation) return;
  const stored = getStoredLocation();
  if (!stored?.stateCode) return;
  storedRevalidation = resolveLocation(stored.stateCode, stored.cityName).then((resolved) => {
    if (resolved === undefined) return;
    if (resolved === null) return apply(null);
    if (resolved.cityId !== stored.cityId || resolved.stateCode !== stored.stateCode) {
      apply({ ...resolved, source: stored.source });
    }
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocode | null> {
  try {
    const geo = await fetch(`/api/location/reverse?lat=${lat}&lng=${lon}`);
    if (!geo.ok) return null;
    const data = await geo.json();
    const stateCode: string = data.state ?? '';
    const cityName: string = data.city ?? '';
    if (!stateCode || !cityName) return null;
    return { stateCode, stateName: data.stateName ?? '', cityName };
  } catch {
    return null;
  }
}

async function detectByIP(): Promise<UserLocation | null> {
  try {
    const res = await fetch('/api/location/ip');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.stateCode || !data.cityName) return null;
    const resolved = await resolveLocation(data.stateCode, data.cityName);
    return resolved ? { ...resolved, source: 'ip' } : null;
  } catch {
    return null;
  }
}

export function useUserLocation() {
  const [location, setLocationState] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<DetectionStatus>('idle');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setLocationState(JSON.parse(raw));
        setStatus('manual');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    function onLocationChanged() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setLocationState(raw ? JSON.parse(raw) : null);
      } catch {
        // ignore
      }
    }
    window.addEventListener(LOCATION_EVENT, onLocationChanged);
    return () => window.removeEventListener(LOCATION_EVENT, onLocationChanged);
  }, []);

  const setLocation = useCallback((loc: UserLocation) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    setLocationState(loc);
    setStatus(loc.source === 'manual' ? 'manual' : 'found');
    window.dispatchEvent(new Event(LOCATION_EVENT));
  }, []);

  const clearLocation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLocationState(null);
    setStatus('idle');
    window.dispatchEvent(new Event(LOCATION_EVENT));
  }, []);

  useEffect(() => {
    revalidateStoredLocationOnce((loc) => (loc ? setLocation(loc) : clearLocation()));
  }, [setLocation, clearLocation]);

  const detectLocation = useCallback(async () => {
    setStatus('detecting');

    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 6000 })
        );
        const { latitude, longitude } = pos.coords;
        const geo = await reverseGeocode(latitude, longitude);
        if (geo) {
          const resolved = await resolveLocation(geo.stateCode, geo.cityName);
          if (resolved) {
            setLocation({ ...resolved, source: 'gps' });
            setStatus('found');
            return;
          }
          // Fora da lista do projeto (outsideList "prompt") → usuário escolhe no seletor.
          if (resolved === null) {
            setStatus('prompt');
            return;
          }
        }
      } catch {
        // GPS negado ou timeout
      }
    }

    const ipLoc = await detectByIP();
    if (ipLoc) {
      setLocation(ipLoc);
      setStatus('found');
      return;
    }

    setStatus('prompt');
  }, [setLocation]);

  return { location, setLocation, clearLocation, detectLocation, status };
}
