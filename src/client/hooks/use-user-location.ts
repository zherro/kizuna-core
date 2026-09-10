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

// As três chamadas externas (Nominatim, IBGE, ip-api) são proxiadas por rotas server-side
// do plugin `location` (`/api/location/reverse`, `/api/location/cities`, `/api/location/ip`) —
// o navegador nunca fala direto com terceiros e as respostas ficam cacheáveis no servidor.

type ReverseGeocode = { stateCode: string; stateName: string; cityName: string };

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

async function cityIdByName(
  stateCode: string,
  cityName: string
): Promise<{ id: number; nome: string }> {
  try {
    const res = await fetch(`/api/location/cities?uf=${encodeURIComponent(stateCode)}`);
    if (res.ok) {
      const data = await res.json();
      const items: { value: string; label: string }[] = Array.isArray(data.items) ? data.items : [];
      const match = items.find((c) => c.label.toLowerCase() === cityName.toLowerCase());
      if (match) return { id: Number(match.value) || 0, nome: match.label };
    }
  } catch {
    // cai no fallback abaixo
  }
  return { id: 0, nome: cityName };
}

async function detectByIP(): Promise<UserLocation | null> {
  try {
    const res = await fetch('/api/location/ip');
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.stateCode || !data.cityName) return null;
    return {
      stateCode: data.stateCode,
      stateName: data.stateName ?? '',
      cityId: 0,
      cityName: data.cityName,
      source: 'ip',
    };
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
          const city = await cityIdByName(geo.stateCode, geo.cityName);
          setLocation({
            stateCode: geo.stateCode,
            stateName: geo.stateName,
            cityId: city.id,
            cityName: city.nome,
            source: 'gps',
          });
          setStatus('found');
          return;
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
