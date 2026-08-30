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

async function ibgeStateByCoords(
  lat: number,
  lon: number
): Promise<{ sigla: string; nome: string } | null> {
  try {
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`,
      { headers: { 'User-Agent': 'location-picker/1.0' } }
    );
    if (!geo.ok) return null;
    const data = await geo.json();
    const stateCode: string = data.address?.['ISO3166-2-lvl4']?.replace('BR-', '') ?? '';
    const stateName: string = data.address?.state ?? '';
    if (!stateCode || !stateName) return null;
    return { sigla: stateCode, nome: stateName };
  } catch {
    return null;
  }
}

async function ibgeCityByCoords(
  lat: number,
  lon: number,
  stateCode: string
): Promise<{ id: number; nome: string } | null> {
  try {
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt-BR`,
      { headers: { 'User-Agent': 'location-picker/1.0' } }
    );
    if (!geo.ok) return null;
    const data = await geo.json();
    const cityName: string =
      data.address?.city ?? data.address?.town ?? data.address?.village ?? '';
    if (!cityName) return null;

    const ibge = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`
    );
    if (!ibge.ok) return null;
    const cities: { id: number; nome: string }[] = await ibge.json();
    const match = cities.find((c) => c.nome.toLowerCase() === cityName.toLowerCase());
    return match ?? { id: 0, nome: cityName };
  } catch {
    return null;
  }
}

async function detectByIP(): Promise<UserLocation | null> {
  try {
    const res = await fetch(
      'https://ip-api.com/json/?lang=pt-BR&fields=status,regionName,region,city'
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'success') return null;
    return {
      stateCode: data.region,
      stateName: data.regionName,
      cityId: 0,
      cityName: data.city,
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
        const state = await ibgeStateByCoords(latitude, longitude);
        if (state) {
          const city = await ibgeCityByCoords(latitude, longitude, state.sigla);
          setLocation({
            stateCode: state.sigla,
            stateName: state.nome,
            cityId: city?.id ?? 0,
            cityName: city?.nome ?? '',
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
