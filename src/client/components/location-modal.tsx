'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Search,
  X,
  ChevronDown,
  Loader2,
  LocateFixed,
  Navigation,
} from 'lucide-react';
import { useUserLocation, type UserLocation } from '../hooks/use-user-location';
import { useViewingCity, useViewingCityConfirm } from './viewing-city';

// ─── API ──────────────────────────────────────────────────────────────────────

/** Cidade do seletor — `/api/location/cities` (plugin `location`: `location_city WHERE search_city`). */
interface CityOption {
  value: string;
  label: string;
  stateCode: string;
  stateName: string;
}

/** Quantas cidades a lista mostra (sem busca: as primeiras por nome; com busca: os primeiros matches). */
const MAX_VISIBLE = 10;

async function fetchCities(): Promise<CityOption[]> {
  const res = await fetch('/api/location/cities');
  if (!res.ok) throw new Error();
  const data = await res.json();
  return Array.isArray(data.items) ? (data.items as CityOption[]) : [];
}

// ─── Trigger (parece select) ──────────────────────────────────────────────────

export function LocationTrigger({ onClick }: { onClick: () => void }) {
  const { location, status } = useUserLocation();
  const viewing = useViewingCity();
  const isDetecting = status === 'detecting' && !viewing;
  const shown = viewing
    ? {
        cityName: viewing.cityName,
        stateName: viewing.stateName,
        stateCode: viewing.stateCode,
        source: 'manual' as const,
      }
    : location;

  return (
    <button
      onClick={onClick}
      disabled={isDetecting}
      aria-label="Selecionar localização"
      className="inline-flex h-9 items-center gap-1.5 rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-primary/5 px-2.5 text-[15px] font-medium text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDetecting ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
      ) : (
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
      )}

      <span className="max-w-[96px] truncate sm:max-w-[150px]">
        {isDetecting ? (
          <span className="text-muted-foreground">Detectando...</span>
        ) : shown ? (
          <>
            <span className="font-medium">{shown.cityName || shown.stateName}</span>
            {shown.cityName && (
              <span className="text-muted-foreground">, {shown.stateCode}</span>
            )}
            {shown.source === 'ip' && (
              <span className="ml-1 text-[10px] text-muted-foreground/70">~</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">Selecionar local</span>
        )}
      </span>

      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function LocationModal({ open, onClose }: LocationModalProps) {
  const { location, setLocation, detectLocation, status } = useUserLocation();
  const viewing = useViewingCity();
  const onViewingConfirm = useViewingCityConfirm();
  // Modo de confirmação: o usuário vê uma cidade (URL) diferente da salva — escolher só seleciona.
  const confirmMode = viewing !== null && location?.cityId !== viewing.cityId;
  const [picked, setPicked] = useState<CityOption | null>(null);

  const savedOption: CityOption | null = location?.cityId
    ? {
        value: String(location.cityId),
        label: location.cityName,
        stateCode: location.stateCode,
        stateName: location.stateName,
      }
    : null;
  const selected = confirmMode ? (picked ?? savedOption) : null;
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);

  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState('');

  // Reset + carrega as cidades ao abrir
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setPicked(null);
    setCitiesError('');
    setCitiesLoading(true);
    fetchCities()
      .then(setCities)
      .catch(() => setCitiesError('Não foi possível carregar as cidades.'))
      .finally(() => setCitiesLoading(false));
  }, [open]);

  // Foca busca
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  // Escape fecha
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Detectar localização de dentro do modal
  async function handleAutoDetect() {
    setDetecting(true);
    await detectLocation();
    setDetecting(false);
    // Se achou, fecha o modal
    if (status === 'found' || status === 'manual') onClose();
    // Se não achou (prompt), continua aberto para o usuário escolher
  }

  function commit(city: CityOption) {
    const next: UserLocation = {
      stateCode: city.stateCode,
      stateName: city.stateName,
      cityId: Number(city.value) || 0,
      cityName: city.label,
      source: 'manual',
    };
    setLocation(next);
    onViewingConfirm?.(next);
    onClose();
  }

  function handleSelectCity(city: CityOption) {
    if (confirmMode) setPicked(city);
    else commit(city);
  }

  const q = normalize(search.trim());
  const visibleCities = (q ? cities.filter((c) => normalize(c.label).includes(q)) : cities).slice(
    0,
    MAX_VISIBLE
  );

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Selecionar localização"
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-[color:var(--ui-card-bg,var(--background))] shadow-xl"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Selecione a cidade</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-[var(--ui-radius-pill,0.375rem)] p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Banner de detecção automática */}
        <div className="border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="text-xs text-muted-foreground">
                {location ? (
                  <>
                    Atual:{' '}
                    <strong className="text-foreground">
                      {location.cityName || location.stateName}
                      {location.cityName ? `, ${location.stateCode}` : ''}
                    </strong>
                    {location.source === 'ip' && ' (aproximado)'}
                  </>
                ) : (
                  'Detectar localização automaticamente'
                )}
              </span>
            </div>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="inline-flex items-center gap-1.5 rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {detecting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Detectando...
                </>
              ) : (
                <>
                  <LocateFixed className="h-3 w-3" />{' '}
                  {location ? 'Reatualizar' : 'Usar minha localização'}
                </>
              )}
            </button>
          </div>
        </div>

        {confirmMode && viewing ? (
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Você está vendo <strong className="text-foreground">{viewing.cityName}</strong>
            </span>
            <button
              onClick={() =>
                commit({
                  value: String(viewing.cityId),
                  label: viewing.cityName,
                  stateCode: viewing.stateCode,
                  stateName: viewing.stateName,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Ficar em {viewing.cityName}
            </button>
          </div>
        ) : null}

        {/* Busca */}
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cidade..."
              className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto">
          {citiesLoading && <LoadingRow label="Carregando cidades..." />}
          {citiesError && <ErrorRow label={citiesError} />}
          {!citiesLoading && !citiesError && visibleCities.length === 0 && (
            <EmptyRow label="Nenhuma cidade encontrada." />
          )}
          {!citiesLoading &&
            !citiesError &&
            visibleCities.map((city) => (
              <button
                key={city.value}
                onClick={() => handleSelectCity(city)}
                aria-label={`${city.label} – ${city.stateCode}`}
                aria-pressed={selected ? selected.value === city.value : undefined}
                className={`flex w-full items-center px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
                  selected?.value === city.value ? 'bg-accent font-semibold' : ''
                }`}
              >
                {city.label}
                <span className="ml-1 text-muted-foreground">– {city.stateCode}</span>
              </button>
            ))}
        </div>

        {confirmMode ? (
          <div className="border-t border-border px-4 py-3">
            <button
              disabled={!selected}
              onClick={() => selected && commit(selected)}
              className="w-full rounded-[var(--ui-radius-pill,0.375rem)] bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar{selected ? ` ${selected.label}` : ''}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
function ErrorRow({ label }: { label: string }) {
  return <p className="py-10 text-center text-sm text-destructive">{label}</p>;
}
function EmptyRow({ label }: { label: string }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{label}</p>;
}
