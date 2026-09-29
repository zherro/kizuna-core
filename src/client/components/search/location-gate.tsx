'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { LocationModal } from '../location-modal';
import {
  getStoredLocation,
  resolveLocation,
  useUserLocation,
  type UserLocation,
} from '../../hooks/use-user-location';

/** Países da América Latina e Caribe (ISO 3166-1 alpha-2) — fora daqui cai no default de SP. */
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
 * Fallback quando o IP é detectado, mas fora da América Latina — melhor que abrir o seletor.
 * Passa pelo `/api/location/resolve` como qualquer detecção: São Paulo fora da lista de cidades
 * (`location_city.search_city`) vira a cidade padrão ou o seletor.
 */
const FOREIGN_IP_FALLBACK = { stateCode: 'SP', cityName: 'São Paulo' };

/**
 * Geolocalização por IP — não pede permissão nenhuma (diferente de `navigator.geolocation`, que
 * sempre abre o prompt do browser). Aproximada (cidade/estado do provedor de internet, não o
 * endereço exato), mas suficiente pra pré-preencher a região sem interromper o usuário.
 *
 * Vai por `/api/location/ip` — proxy server-side (plugin `location`) do ip-api.com. O IP do
 * visitante é lido do header do proxy no servidor, não vaza do navegador, e a chamada externa
 * é HTTP pura do lado do servidor (o motivo de antes usar `ipwho.is` em vez de `ip-api.com`
 * direto — plano grátis HTTP-only — deixa de importar).
 *
 * IP fora da América Latina (VPN, acesso de fora, etc.) → o estado/cidade do provedor não fazem
 * sentido pra esse marketplace (só atua no Brasil) — usa São Paulo como default em vez de mostrar
 * uma região estrangeira ou abrir o seletor manual.
 *
 * O resultado sempre passa por `/api/location/resolve` (lista de cidades do projeto + regra
 * `location.outsideList` do kizuna.config.json); `null` → seletor manual. IP indisponível (dev,
 * ip-api fora do ar) também passa pelo `resolve`, sem UF: com cidade padrão configurada a busca
 * abre direto nela em vez de mostrar o seletor.
 */
async function detectLocationByIp(): Promise<{ stateCode: string; cityName: string } | null> {
  try {
    const res = await fetch('/api/location/ip', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      stateCode?: string;
      cityName?: string;
      countryCode?: string;
    };
    if (!data.countryCode || !LATIN_AMERICA_COUNTRY_CODES.has(data.countryCode)) {
      return FOREIGN_IP_FALLBACK;
    }
    return data.stateCode ? { stateCode: data.stateCode, cityName: data.cityName ?? '' } : null;
  } catch {
    return null;
  }
}

async function detectLocationByIpSilently(): Promise<UserLocation | null> {
  const detected = await detectLocationByIp();
  const resolved = await resolveLocation(detected?.stateCode ?? '', detected?.cityName ?? '');
  return resolved ? { ...resolved, source: 'ip' } : null;
}

/**
 * Portão de localização da /busca: a localização (estado + cidade) é obrigatória. Antes de pedir
 * ao usuário, tenta detectar silenciosamente por IP (sem prompt de permissão) e cai na cidade
 * padrão do projeto, se houver — só mostra o seletor manual quando nada disso dá um local.
 */
export function LocationGate({ children }: { children: React.ReactNode }) {
  const { location, setLocation } = useUserLocation();
  const [hydrated, setHydrated] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetectDone, setAutoDetectDone] = useState(false);
  const [checkTick, setCheckTick] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // `location` do hook + leitura direta cobrem o gap entre hidratação e o evento de mudança.
  const stored = hydrated ? (location ?? getStoredLocation()) : null;
  const hasLocation = Boolean(stored?.stateCode);

  useEffect(() => {
    if (!hydrated || hasLocation || autoDetectDone) return;
    let active = true;
    setAutoDetecting(true);
    detectLocationByIpSilently().then((loc) => {
      if (!active) return;
      if (loc) setLocation(loc);
      setAutoDetecting(false);
      setAutoDetectDone(true);
    });
    return () => {
      active = false;
    };
  }, [hydrated, hasLocation, autoDetectDone, setLocation]);

  if (!hydrated || autoDetecting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {hydrated ? 'Detectando sua região…' : 'Carregando...'}
        </p>
      </div>
    );
  }

  if (hasLocation) return <>{children}</>;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MapPin className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-bold">Onde você está?</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Não conseguimos detectar sua região automaticamente. Escolha seu estado e cidade para ver
          os serviços disponíveis perto de você.
        </p>
      </div>
      <LocationModal open onClose={() => setCheckTick((n) => n + 1)} key={checkTick} />
    </div>
  );
}
