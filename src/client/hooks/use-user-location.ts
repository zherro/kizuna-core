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

/** Países da América Latina e Caribe (ISO 3166-1 alpha-2) — IP fora daqui não é usado. */
const LATIN_AMERICA_COUNTRY_CODES = new Set([
  'AR',
  'BO',
  'BR',
  'CL',
  'CO',
  'CR',
  'CU',
  'DO',
  'EC',
  'SV',
  'GT',
  'HN',
  'MX',
  'NI',
  'PA',
  'PY',
  'PE',
  'PR',
  'UY',
  'VE', // América Latina "central"
  'BZ',
  'GY',
  'SR',
  'GF', // vizinhos geográficos da região (Belize, Guianas)
  'HT',
  'JM',
  'TT',
  'BS',
  'BB', // Caribe
]);

/**
 * IP fora da América Latina (VPN, acesso de fora): a região do provedor não faz sentido pra um
 * marketplace brasileiro — detecta como São Paulo, que o `resolve` troca pela cidade padrão
 * (ou por nada, com `outsideList: "prompt"`) se não estiver na lista.
 */
const FOREIGN_IP_FALLBACK = { stateCode: 'SP', cityName: 'São Paulo' };

/**
 * Geolocalização por IP — sem prompt de permissão (diferente de `navigator.geolocation`).
 * Aproximada (cidade/UF do provedor), via `/api/location/ip` (proxy server-side do ip-api.com;
 * o IP do visitante é lido no servidor). Depois passa pelo `resolve`, SEMPRE — inclusive quando
 * o IP não dá nada (dev, ip-api fora do ar): aí vai sem UF e o `resolve` devolve a cidade padrão
 * do projeto, se houver. `null` = nenhum local (o usuário escolhe no seletor).
 */
async function detectByIP(): Promise<UserLocation | null> {
  let detected: { stateCode: string; cityName: string } | null = null;
  try {
    const res = await fetch('/api/location/ip', { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = (await res.json()) as {
        stateCode?: string;
        cityName?: string;
        countryCode?: string;
      };
      if (!data.countryCode || !LATIN_AMERICA_COUNTRY_CODES.has(data.countryCode)) {
        detected = FOREIGN_IP_FALLBACK;
      } else if (data.stateCode) {
        detected = { stateCode: data.stateCode, cityName: data.cityName ?? '' };
      }
    }
  } catch {
    // IP indisponível — segue para o resolve sem UF
  }
  const resolved = await resolveLocation(detected?.stateCode ?? '', detected?.cityName ?? '');
  return resolved ? { ...resolved, source: 'ip' } : null;
}

/**
 * Inicialização do local — uma vez por carga de página, a MESMA em qualquer tela (header da home,
 * /busca, ...); todas as instâncias do hook compartilham a promessa:
 *  - com local salvo: revalida contra a lista de cidades (pode ser de antes dela — ex.: "São
 *    Paulo" de uma visita antiga); fora dela vira a cidade padrão ou é apagado;
 *  - sem local salvo: detecta por IP (+ cidade padrão como fallback), sem pedir permissão.
 */
let initialization: Promise<void> | null = null;
let initialized = false;

function initializeLocationOnce(apply: (loc: UserLocation | null) => void): Promise<void> {
  if (initialization) return initialization;
  const stored = getStoredLocation();
  const run = stored?.stateCode
    ? resolveLocation(stored.stateCode, stored.cityName).then((resolved) => {
        if (resolved === undefined) return;
        if (resolved === null) return apply(null);
        if (resolved.cityId !== stored.cityId || resolved.stateCode !== stored.stateCode) {
          apply({ ...resolved, source: stored.source });
        }
      })
    : detectByIP().then((loc) => {
        if (loc) apply(loc);
      });
  initialization = run.finally(() => {
    initialized = true;
  });
  return initialization;
}

/** Só para testes. */
export function __resetLocationInit() {
  initialization = null;
  initialized = false;
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

export function useUserLocation() {
  const [location, setLocationState] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<DetectionStatus>('idle');
  /** true depois da inicialização (revalidação ou detecção por IP) — `location` já é o final. */
  const [ready, setReady] = useState(initialized);

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
    let active = true;
    initializeLocationOnce((loc) => (loc ? setLocation(loc) : clearLocation())).then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
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

  return { location, setLocation, clearLocation, detectLocation, status, ready };
}
