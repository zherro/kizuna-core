'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Search,
  X,
  ChevronDown,
  Loader2,
  LocateFixed,
  Check,
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
  // A cidade escolhida pela pessoa vence; a da página (anúncio com cidade na URL) só entra quando
  // não há nenhuma escolhida — senão abrir uma notícia de Cuiabá "trocava" a cidade de quem está em
  // Várzea Grande. A diferença entre as duas continua no convite (`CityInvite`) e no seletor.
  const isDetecting = status === 'detecting' && !location && !viewing;
  const shown =
    location ??
    (viewing
      ? {
          cityName: viewing.cityName,
          stateName: viewing.stateName,
          stateCode: viewing.stateCode,
          source: 'manual' as const,
        }
      : null);

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

/** Até quantas cidades cabem como "cartões" grandes sem precisar de busca. */
const CHIPS_MAX = 6;

/** Cores só por tokens do tema (misturas via color-mix — utilitários de cor de borda/sombra não valem aqui). */
const TINT = (pct: number) => `color-mix(in oklab, var(--primary) ${pct}%, var(--card))`;
const RING = '0 0 0 3px color-mix(in oklab, var(--primary) 35%, transparent)';

const MODAL_CSS = `
@keyframes lm-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes lm-sheet { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
.lm-overlay { animation: lm-fade .18s ease-out both }
.lm-panel { animation: lm-sheet .26s cubic-bezier(.16,1,.3,1) both }
@media (prefers-reduced-motion: reduce) { .lm-overlay, .lm-panel { animation: none } }
.lm-opt { background: transparent }
.lm-opt:hover { background: ${TINT(8)} }
.lm-opt:focus-visible { outline: none; background: ${TINT(12)}; box-shadow: ${RING} }
.lm-opt[data-on='true'] { background: ${TINT(12)} }
.lm-chip { background: ${TINT(6)} }
.lm-chip:hover { background: ${TINT(11)} }
.lm-chip:focus-visible { outline: none; box-shadow: ${RING} }
.lm-chip[data-on='true'] { background: ${TINT(14)} }
.lm-search { background: ${TINT(5)}; transition: box-shadow .15s, background .15s }
.lm-search:focus-within { background: ${TINT(9)}; box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent) }
.lm-btn:focus-visible { outline: none; box-shadow: ${RING} }
@keyframes lm-pulso { 0%, 100% { box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 30%, transparent) } 50% { box-shadow: 0 0 0 6px color-mix(in oklab, var(--primary) 12%, transparent) } }
.lm-destaque { background: ${TINT(10)}; box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 30%, transparent); animation: lm-pulso 1.6s ease-in-out 2 }
.lm-destaque-cidades .lm-chip { background: ${TINT(10)} }
@media (prefers-reduced-motion: reduce) { .lm-destaque { animation: none } }
`;

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
  // Só visual: marca com o "check" a cidade escolhida (confirmação) ou a atual.
  const marked = confirmMode ? selected : savedOption;
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectTried, setDetectTried] = useState(false);

  const [cities, setCities] = useState<CityOption[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState('');

  // Reset + carrega as cidades ao abrir
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setPicked(null);
    setDetectTried(false);
    setCitiesError('');
    setCitiesLoading(true);
    fetchCities()
      .then(setCities)
      .catch(() => setCitiesError('Não foi possível carregar as cidades.'))
      .finally(() => setCitiesLoading(false));
  }, [open]);

  // Foco ao abrir: busca no desktop; no celular o painel (o teclado esconderia as cidades)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const coarse =
        typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
      (coarse ? panelRef.current : searchRef.current)?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [open]);

  // Localização falhou: leva o foco para a busca (no desktop; no celular o teclado taparia as
  // cidades, que ficam em destaque).
  useEffect(() => {
    if (!open || !detectTried || detecting || status !== 'prompt') return;
    const coarse =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (!coarse) searchRef.current?.focus();
  }, [open, detectTried, detecting, status]);

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
    setDetectTried(true);
    await detectLocation();
    setDetecting(false);
    // Se achou, fecha o modal
    if (status === 'found' || status === 'manual') onClose();
    // Se não achou (prompt), continua aberto para o usuário escolher
  }

  // Achou depois do clique → fecha (o `status` acima é o do render do clique).
  useEffect(() => {
    if (open && detectTried && (status === 'found' || status === 'manual')) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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
  const asChips = !q && cities.length > 0 && cities.length <= CHIPS_MAX;
  const detectDenied = detectTried && !detecting && status === 'prompt';

  // Teclado: setas andam pelas cidades, Enter na busca escolhe a primeira, Tab fica dentro do painel.
  function handleKeyDown(e: React.KeyboardEvent) {
    const panel = panelRef.current;
    if (!panel) return;
    if (e.key === 'Tab') {
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const opts = Array.from(panel.querySelectorAll<HTMLElement>('[data-city-option]'));
      if (opts.length === 0) return;
      e.preventDefault();
      const idx = opts.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'ArrowDown') opts[idx < 0 ? 0 : Math.min(idx + 1, opts.length - 1)].focus();
      else if (idx <= 0) searchRef.current?.focus();
      else opts[idx - 1].focus();
      return;
    }
    if (e.key === 'Enter' && e.target === searchRef.current && q && visibleCities[0]) {
      e.preventDefault();
      handleSelectCity(visibleCities[0]);
    }
  }

  if (!open) return null;

  const currentLabel = location
    ? `${location.cityName || location.stateName}${location.cityName ? `, ${location.stateCode}` : ''}`
    : '';

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="lm-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"
    >
      <style>{MODAL_CSS}</style>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Selecionar localização"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="lm-panel relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[1.5rem] bg-[color:var(--card)] text-[color:var(--card-foreground,var(--foreground))] shadow-[var(--shadow-soft-3,0_-8px_30px_rgba(0,0,0,0.18))] outline-none sm:max-w-md sm:rounded-[1.25rem]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Alça (só no celular) */}
        <div aria-hidden="true" className="flex shrink-0 justify-center pt-2.5 sm:hidden">
          <span
            className="h-1 w-10 rounded-full"
            style={{ background: 'color-mix(in oklab, var(--foreground) 18%, transparent)' }}
          />
        </div>

        {/* Cabeçalho */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-3 sm:pt-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">Selecione a cidade</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Assim mostramos os serviços perto de você.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="lm-btn -mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            style={{ background: 'color-mix(in oklab, var(--foreground) 6%, transparent)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {/* Detecção automática */}
          <div className="mt-2 rounded-2xl p-3" style={{ background: TINT(7) }}>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {detecting ? (
                'Procurando onde você está...'
              ) : detectDenied ? (
                <>
                  <strong className="block text-foreground">
                    Tudo bem, escolha sua cidade aqui embaixo.
                  </strong>
                  Não deu para achar sua localização. Toque na sua cidade ou busque pelo nome.
                </>
              ) : location ? (
                <>
                  Você está em <strong className="text-foreground">{currentLabel}</strong>
                  {location.source === 'ip' && ' (aproximado)'}
                </>
              ) : (
                'Prefere que a gente descubra por você?'
              )}
            </p>
            <button
              onClick={handleAutoDetect}
              disabled={detecting}
              className="lm-btn mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              // Depois de uma falha a ação principal passa a ser escolher a cidade: botão mais discreto.
              style={{ background: detectDenied ? TINT(8) : TINT(16) }}
            >
              {detecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Procurando...
                </>
              ) : (
                <>
                  <LocateFixed className="h-4 w-4 text-primary" />
                  {location ? 'Reatualizar' : detectDenied ? 'Tentar de novo' : 'Usar minha localização'}
                </>
              )}
            </button>
          </div>

          {confirmMode && viewing ? (
            <div
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl p-3"
              style={{ background: TINT(7) }}
            >
              <span className="text-sm text-muted-foreground">
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
                className="lm-btn inline-flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold text-foreground"
                style={{ background: TINT(16) }}
              >
                Ficar em {viewing.cityName}
              </button>
            </div>
          ) : null}

          {/* Busca */}
          <div
            className={`lm-search mt-3 flex items-center gap-2 rounded-2xl px-3.5${detectDenied && !search ? ' lm-destaque' : ''}`}
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cidade..."
              aria-label="Buscar cidade"
              autoComplete="off"
              enterKeyHint="search"
              className="h-12 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  searchRef.current?.focus();
                }}
                aria-label="Limpar busca"
                className="lm-btn -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className={`mt-3${detectDenied ? ' lm-destaque-cidades' : ''}`}>
            {citiesLoading && <LoadingRow label="Carregando cidades..." />}
            {citiesError && <ErrorRow label={citiesError} />}
            {!citiesLoading && !citiesError && visibleCities.length === 0 && (
              <EmptyRow
                title={q ? 'Não achamos essa cidade' : 'Nenhuma cidade disponível por enquanto'}
                hint={q ? 'Confira se escreveu certo ou tente só o começo do nome.' : undefined}
              />
            )}
            {!citiesLoading && !citiesError && visibleCities.length > 0 && (
              <div
                className={asChips ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'}
                role="group"
                aria-label="Cidades"
              >
                {visibleCities.map((city) => {
                  const on = marked?.value === city.value;
                  return (
                    <button
                      key={city.value}
                      data-city-option
                      data-on={on}
                      onClick={() => handleSelectCity(city)}
                      aria-label={`${city.label} – ${city.stateCode}`}
                      aria-pressed={selected ? selected.value === city.value : undefined}
                      className={
                        asChips
                          ? 'lm-chip flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-2xl px-3.5 py-2.5 text-left transition-colors'
                          : 'lm-opt flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors'
                      }
                    >
                      {asChips ? (
                        <>
                          <span className="flex w-full items-center gap-1.5">
                            <MapPin className="h-4 w-4 shrink-0 text-primary" />
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
                              {city.label}
                            </span>
                            {on && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          </span>
                          <span className="pl-[22px] text-xs text-muted-foreground">
                            {city.stateCode}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: TINT(10) }}
                          >
                            <MapPin className="h-4 w-4 text-primary" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[15px]">
                            <span className="font-semibold text-foreground">{city.label}</span>
                            <span className="ml-1.5 text-muted-foreground">{city.stateCode}</span>
                          </span>
                          {on && <Check className="h-5 w-5 shrink-0 text-primary" />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {confirmMode ? (
          <div className="shrink-0 px-4 pb-4 pt-1">
            <button
              disabled={!selected}
              onClick={() => selected && commit(selected)}
              className="lm-btn min-h-12 w-full rounded-xl bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
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
function EmptyRow({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[15px] font-semibold text-foreground">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}
