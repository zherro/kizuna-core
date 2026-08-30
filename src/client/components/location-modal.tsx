'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Loader2,
  LocateFixed,
  Navigation,
} from 'lucide-react';
import { type UserLocation, useUserLocation } from '../hooks/use-user-location';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}
interface IBGECity {
  id: number;
  nome: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchStates(): Promise<IBGEState[]> {
  const res = await fetch(
    'https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'
  );
  if (!res.ok) throw new Error();
  return res.json();
}

async function fetchCities(stateCode: string): Promise<IBGECity[]> {
  const res = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`
  );
  if (!res.ok) throw new Error();
  return res.json();
}

// ─── Trigger (parece select) ──────────────────────────────────────────────────

export function LocationTrigger({ onClick }: { onClick: () => void }) {
  const { location, status } = useUserLocation();
  const isDetecting = status === 'detecting';

  return (
    <button
      onClick={onClick}
      disabled={isDetecting}
      aria-label="Selecionar localização"
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm text-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDetecting ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}

      <span className="max-w-[150px] truncate">
        {isDetecting ? (
          <span className="text-muted-foreground">Detectando...</span>
        ) : location ? (
          <>
            <span className="font-medium">{location.cityName || location.stateName}</span>
            {location.cityName && (
              <span className="text-muted-foreground">, {location.stateCode}</span>
            )}
            {location.source === 'ip' && (
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

type Step = 'state' | 'city';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

export function LocationModal({ open, onClose }: LocationModalProps) {
  const { location, setLocation, detectLocation, status } = useUserLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('state');
  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);

  const [states, setStates] = useState<IBGEState[]>([]);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesError, setStatesError] = useState('');

  const [selectedState, setSelectedState] = useState<IBGEState | null>(null);
  const [cities, setCities] = useState<IBGECity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState('');

  // Reset + carrega estados ao abrir
  useEffect(() => {
    if (!open) return;
    setStep('state');
    setSearch('');
    setSelectedState(null);
    setCities([]);
    setStatesError('');
    setStatesLoading(true);
    fetchStates()
      .then(setStates)
      .catch(() => setStatesError('Não foi possível carregar os estados.'))
      .finally(() => setStatesLoading(false));
  }, [open]);

  // Foca busca
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open, step]);

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

  async function handleSelectState(state: IBGEState) {
    setSelectedState(state);
    setStep('city');
    setSearch('');
    setCitiesError('');
    setCitiesLoading(true);
    try {
      setCities(await fetchCities(state.sigla));
    } catch {
      setCitiesError('Não foi possível carregar as cidades.');
    } finally {
      setCitiesLoading(false);
    }
  }

  function handleSelectCity(city: IBGECity) {
    if (!selectedState) return;
    setLocation({
      stateCode: selectedState.sigla,
      stateName: selectedState.nome,
      cityId: city.id,
      cityName: city.nome,
      source: 'manual',
    });
    onClose();
  }

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const q = normalize(search.trim());
  const filteredStates = q
    ? states.filter((s) => normalize(s.nome).includes(q) || normalize(s.sigla).includes(q))
    : states;
  const filteredCities = q ? cities.filter((c) => normalize(c.nome).includes(q)) : cities;

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
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            {step === 'city' && (
              <button
                onClick={() => {
                  setStep('state');
                  setSearch('');
                }}
                aria-label="Voltar"
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
              </button>
            )}
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {step === 'state' ? 'Selecione o estado' : `${selectedState?.nome} — cidade`}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Banner de detecção automática — só no step inicial */}
        {step === 'state' && (
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
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
        )}

        {/* Busca */}
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={step === 'state' ? 'Buscar estado...' : 'Buscar cidade...'}
              className="h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto">
          {step === 'state' && (
            <>
              {statesLoading && <LoadingRow label="Carregando estados..." />}
              {statesError && <ErrorRow label={statesError} />}
              {!statesLoading && !statesError && filteredStates.length === 0 && (
                <EmptyRow label="Nenhum estado encontrado." />
              )}
              {!statesLoading &&
                !statesError &&
                filteredStates.map((state) => (
                  <button
                    key={state.id}
                    onClick={() => handleSelectState(state)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span>{state.nome}</span>
                    <span className="font-mono text-xs text-muted-foreground">{state.sigla}</span>
                  </button>
                ))}
            </>
          )}

          {step === 'city' && (
            <>
              {citiesLoading && <LoadingRow label="Carregando cidades..." />}
              {citiesError && <ErrorRow label={citiesError} />}
              {!citiesLoading && !citiesError && filteredCities.length === 0 && (
                <EmptyRow label="Nenhuma cidade encontrada." />
              )}
              {!citiesLoading &&
                !citiesError &&
                filteredCities.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectCity(city)}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {city.nome}
                  </button>
                ))}
            </>
          )}
        </div>
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
