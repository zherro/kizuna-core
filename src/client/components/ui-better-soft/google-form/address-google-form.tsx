'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Crosshair, Loader2, MapPin, Navigation, Search, X } from 'lucide-react';

import { cn } from '../../../../lib/utils';

// ============================================================
// TYPES
// ============================================================

export type AddressValue = {
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;

  latitude: number | null;
  longitude: number | null;

  placeId: string | null;
  formattedAddress: string | null;
};

type AddressSearchResult = {
  id?: string;

  displayName?: {
    text?: string;
  };

  formattedAddress?: string;

  location?: {
    latitude?: number;
    longitude?: number;
  };

  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
};

export type AddressFeatureFlags = {
  /**
   * Exibe o botão "Pesquisar localização".
   */
  search: boolean;

  /**
   * Permite pesquisar endereço dentro do drawer.
   */
  modalSearch: boolean;

  /**
   * Exibe opção para selecionar localização.
   *
   * Reservado para implementação de seleção por mapa/GPS.
   */
  locationSelection: boolean;

  /**
   * Exibe mini mapa.
   *
   * IMPORTANTE:
   * O mapa real pode gerar custo e precisa de uma estratégia
   * própria de carregamento.
   */
  map: boolean;
};

type AddressFormProps = {
  value?: Partial<AddressValue>;

  onChange?: (value: AddressValue) => void;

  features?: Partial<AddressFeatureFlags>;

  disabled?: boolean;

  className?: string;

  /**
   * `'compact'` shows only the CEP field inline; once it resolves (or the user picks a result
   * from search), the rest collapses into a one-line summary + "Editar" button that opens the
   * full field set in an overlay. Cuts how much of the step the address takes up. Defaults to
   * `'full'` (every field inline, current behaviour).
   */
  layout?: 'full' | 'compact';

  /** Label for the search trigger. Defaults to "Pesquisar localização". */
  searchLabel?: string;

  /** Destaca o CEP (rótulo forte e campo maior) como campo principal. Default `false`. */
  emphasizeCep?: boolean;

  /**
   * `false`: CEP opcional — os campos de rua/número/bairro já vêm liberados (sem esperar CEP ou
   * busca) e o rótulo vira "CEP (opcional)". Cidade/UF continuam vindo do CEP ou da busca. Default `true`.
   */
  requirePostalCode?: boolean;
};

// ============================================================
// DEFAULTS
// ============================================================

const DEFAULT_FEATURES: AddressFeatureFlags = {
  search: true,
  modalSearch: true,
  locationSelection: false,
  map: false,
};

// ============================================================
// COMPONENT
// ============================================================

/** Dicas do estado "nenhum endereço encontrado" — formas de pesquisar que a busca entende. */
const ADDRESS_SEARCH_TIPS = [
  { label: 'Nome do lugar', example: 'como aparece no Google, ex.: Parque da Cidade' },
  { label: 'Rua e número', example: 'ex.: Rua das Flores, 120' },
  { label: 'CEP', example: 'ex.: 01310-100' },
  { label: 'Bairro e cidade', example: 'ex.: Centro, Campinas' },
];

export function AddressForm({
  value,
  onChange,
  features: featureOverrides,
  disabled = false,
  className,
  layout = 'full',
  searchLabel = 'Pesquisar localização',
  emphasizeCep = false,
  requirePostalCode = true,
}: AddressFormProps) {
  const cepId = useId();
  const features = useMemo(
    () => ({
      ...DEFAULT_FEATURES,
      ...featureOverrides,
    }),
    [featureOverrides]
  );

  const [address, setAddress] = useState<AddressValue>({
    postalCode: value?.postalCode ?? '',

    street: value?.street ?? '',

    number: value?.number ?? '',

    complement: value?.complement ?? '',

    neighborhood: value?.neighborhood ?? '',

    city: value?.city ?? '',

    state: value?.state ?? '',

    country: value?.country ?? 'BR',

    latitude: value?.latitude ?? null,

    longitude: value?.longitude ?? null,

    placeId: value?.placeId ?? null,

    formattedAddress: value?.formattedAddress ?? null,
  });

  const [cepLoading, setCepLoading] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  const [searchValue, setSearchValue] = useState('');

  const [searchLoading, setSearchLoading] = useState(false);

  const [results, setResults] = useState<AddressSearchResult[]>([]);

  // Coordenadas digitadas (alternativa ao CEP): abre com os valores atuais, se houver.
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [latText, setLatText] = useState(value?.latitude != null ? String(value.latitude) : '');
  const [lngText, setLngText] = useState(value?.longitude != null ? String(value.longitude) : '');
  const [coordsLoading, setCoordsLoading] = useState(false);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const latId = useId();
  const lngId = useId();

  // ============================================================
  // UNLOCK
  // ============================================================

  const addressUnlocked = useMemo(() => {
    const cep = address.postalCode.replace(/\D/g, '');

    return !requirePostalCode || cep.length === 8 || address.latitude !== null;
  }, [requirePostalCode, address.postalCode, address.latitude]);

  // ============================================================
  // UPDATE
  // ============================================================

  function updateAddress(changes: Partial<AddressValue>) {
    setAddress((current) => {
      const next = {
        ...current,
        ...changes,
      };

      onChange?.(next);

      return next;
    });
  }

  // ============================================================
  // CEP
  // ============================================================

  async function handleCepChange(rawValue: string) {
    const postalCode = rawValue.replace(/\D/g, '').slice(0, 8);
    setCoordsError(null);

    updateAddress({
      postalCode,
    });

    if (postalCode.length !== 8) {
      return;
    }

    await searchCep(postalCode);
  }

  async function searchCep(postalCode: string) {
    try {
      setCepLoading(true);

      const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);

      if (!response.ok) {
        throw new Error('Erro ao consultar CEP');
      }

      const data = await response.json();

      if (data.erro) {
        return;
      }

      updateAddress({
        postalCode,

        street: data.logradouro ?? '',

        neighborhood: data.bairro ?? '',

        city: data.localidade ?? '',

        state: data.uf ?? '',

        country: 'BR',
      });
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
    } finally {
      setCepLoading(false);
    }
  }

  // ============================================================
  // COORDINATES (alternativa ao CEP)
  // ============================================================

  /** Colar "-15.60, -56.09" (como o Google Maps copia) no campo de latitude preenche os dois. */
  function handleLatChange(raw: string) {
    const pair = splitCoordinatePair(raw);
    if (pair) {
      setLatText(pair[0]);
      setLngText(pair[1]);
    } else {
      setLatText(raw);
    }
    setCoordsError(null);
  }

  async function applyCoordinates() {
    const latitude = parseCoordinate(latText);
    const longitude = parseCoordinate(lngText);
    if (latitude === null || latitude < -90 || latitude > 90) {
      setCoordsError('Latitude inválida. Use um número entre -90 e 90, ex.: -15.6014.');
      return;
    }
    if (longitude === null || longitude < -180 || longitude > 180) {
      setCoordsError('Longitude inválida. Use um número entre -180 e 180, ex.: -56.0979.');
      return;
    }
    setCoordsError(null);
    updateAddress({ latitude, longitude, placeId: null, formattedAddress: null, country: 'BR' });

    // Cidade/UF (e o CEP, quando o mapa conhece) a partir do ponto — o CEP é o que dá o código
    // IBGE da cidade ao salvar. Falha aqui não desfaz as coordenadas.
    try {
      setCoordsLoading(true);
      const response = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
      const data = (await response.json().catch(() => null)) as {
        zipCode?: string;
        city?: string;
        state?: string;
      } | null;
      if (!response.ok || !data?.city) {
        setCoordsError('Coordenadas salvas, mas não achamos a cidade desse ponto. Confira os números.');
        return;
      }
      updateAddress({
        city: data.city,
        state: data.state ?? '',
        ...(data.zipCode && data.zipCode.length === 8 ? { postalCode: data.zipCode } : {}),
      });
    } catch {
      setCoordsError('Coordenadas salvas, mas não foi possível consultar a cidade agora.');
    } finally {
      setCoordsLoading(false);
    }
  }

  // ============================================================
  // SEARCH DRAWER
  // ============================================================

  async function openSearch() {
    if (disabled || !features.search) {
      return;
    }

    setSearchValue(buildSearchValue(address));

    setResults([]);

    setSearchOpen(true);
  }

  function closeSearch() {
    setSearchOpen(false);
    setResults([]);
  }

  // ============================================================
  // GOOGLE SEARCH
  // ============================================================

  async function searchGoogle(query: string) {
    if (!features.modalSearch || query.trim().length < 3) {
      setResults([]);
      return;
    }

    try {
      setSearchLoading(true);

      const response = await fetch(
        `/api/location/address/search?q=${encodeURIComponent(query.trim())}`
      );

      if (!response.ok) {
        throw new Error('Erro ao pesquisar endereço');
      }

      const data = await response.json();

      setResults(data.places ?? []);
    } catch (error) {
      console.error('Erro ao pesquisar endereço:', error);

      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  // ============================================================
  // DEBOUNCE
  // ============================================================

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchOpen) {
      return;
    }

    if (searchValue.trim().length < 3) {
      setResults([]);
      return;
    }

    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      searchGoogle(searchValue);
    }, 500);

    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, [searchValue, searchOpen]);

  // ============================================================
  // SELECT RESULT
  // ============================================================

  function handleSelectResult(result: AddressSearchResult) {
    const parsed = parseGoogleResult(result);

    updateAddress(parsed);

    closeSearch();
  }

  // ============================================================
  // FIELDS
  // ============================================================

  const fieldDisabled = disabled || !addressUnlocked;
  const resolved = Boolean(address.street.trim() || address.city.trim());

  const cepField = (
    <div>
      <label
        htmlFor={cepId}
        className={
          emphasizeCep
            ? 'mb-1.5 block text-sm font-semibold text-foreground'
            : 'mb-1.5 block text-xs font-medium text-muted-foreground'
        }
      >
        {requirePostalCode ? 'CEP' : 'CEP (opcional)'}
      </label>

      <div className="relative">
        <input
          id={cepId}
          value={formatCep(address.postalCode)}
          onChange={(event) => handleCepChange(event.target.value)}
          disabled={disabled}
          placeholder="00000-000"
          inputMode="numeric"
          className={cn(
            inputClass,
            'pr-10',
            emphasizeCep && 'h-12 border-primary/60 text-base font-semibold tracking-wide'
          )}
        />

        {cepLoading && (
          <Loader2
            className="
              absolute right-3 top-1/2
              h-4 w-4
              -translate-y-1/2
              animate-spin
              text-muted-foreground
            "
          />
        )}
      </div>
    </div>
  );

  const searchTrigger = features.search && (
    <button
      type="button"
      disabled={disabled}
      onClick={openSearch}
      className="
        inline-flex h-9
        items-center gap-2
        rounded-[var(--ui-radius-control,0.5rem)]
        border border-border
        px-3
        text-xs font-medium
        text-foreground
        transition-colors
        hover:bg-muted
        disabled:pointer-events-none
        disabled:opacity-50
      "
    >
      <Search className="h-4 w-4" />
      {searchLabel}
    </button>
  );

  const coordsField = (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={coordsOpen}
        onClick={() => setCoordsOpen((open) => !open)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
      >
        <Crosshair className="h-3.5 w-3.5" />
        {coordsOpen ? 'Fechar latitude e longitude' : 'Sem CEP? Informar latitude e longitude'}
      </button>

      {coordsOpen && (
        <div className="space-y-3 rounded-[var(--ui-radius-card-compact,0.75rem)] border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            No Google Maps, toque e segure no lugar e copie os números. Pode colar os dois juntos
            no campo de latitude.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={latId} className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Latitude
              </label>
              <input
                id={latId}
                value={latText}
                onChange={(event) => handleLatChange(event.target.value)}
                disabled={disabled}
                placeholder="-15.6014"
                inputMode="decimal"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={lngId} className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Longitude
              </label>
              <input
                id={lngId}
                value={lngText}
                onChange={(event) => {
                  setLngText(event.target.value);
                  setCoordsError(null);
                }}
                disabled={disabled}
                placeholder="-56.0979"
                inputMode="decimal"
                className={inputClass}
              />
            </div>
          </div>
          {coordsError && (
            <p role="alert" className="text-xs text-destructive">
              {coordsError}
            </p>
          )}
          <button
            type="button"
            disabled={disabled || coordsLoading || !latText.trim() || !lngText.trim()}
            onClick={() => void applyCoordinates()}
            className="inline-flex h-9 items-center gap-2 rounded-[var(--ui-radius-control,0.5rem)] bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {coordsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Usar estas coordenadas
          </button>
        </div>
      )}
    </div>
  );

  const detailFields = (
    <>
      {/* STREET / NUMBER */}
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <Field
          label="Endereço"
          value={address.street}
          disabled={fieldDisabled}
          onChange={(value) =>
            updateAddress({
              street: value,
            })
          }
        />

        <Field
          label="Número"
          value={address.number}
          disabled={fieldDisabled}
          onChange={(value) =>
            updateAddress({
              number: value,
            })
          }
        />
      </div>

      {/* COMPLEMENT */}
      <Field
        label="Complemento"
        value={address.complement}
        disabled={fieldDisabled}
        onChange={(value) =>
          updateAddress({
            complement: value,
          })
        }
      />

      {/* NEIGHBORHOOD */}
      <Field
        label="Bairro"
        value={address.neighborhood}
        disabled={fieldDisabled}
        onChange={(value) =>
          updateAddress({
            neighborhood: value,
          })
        }
      />

      {/* CITY / STATE */}
      <div className="grid grid-cols-[1fr_90px] gap-4">
        {/* Com CEP, cidade/UF vêm dele (ou da busca); sem CEP obrigatório, dá pra digitar. */}
        <Field
          label="Cidade"
          value={address.city}
          disabled={requirePostalCode || disabled}
          onChange={(value) => updateAddress({ city: value })}
        />

        <Field
          label="UF"
          value={address.state}
          disabled={requirePostalCode || disabled}
          onChange={(value) => updateAddress({ state: value.toUpperCase().slice(0, 2) })}
        />
      </div>

      {/* COORDINATES */}
      {address.latitude !== null && address.longitude !== null && (
        <div
          className="
            flex items-center gap-2
            rounded-lg
            bg-muted/50
            px-3 py-2
            text-xs
            text-muted-foreground
          "
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />

          <span className="truncate">
            {address.formattedAddress ?? `${address.latitude}, ${address.longitude}`}
          </span>
        </div>
      )}

      {/* MAP */}
      {features.map && address.latitude !== null && address.longitude !== null && (
        <MiniMap latitude={address.latitude} longitude={address.longitude} />
      )}
    </>
  );

  const searchDrawer = searchOpen && (
    <BodyPortal>
      <SearchDrawer
      value={searchValue}
      loading={searchLoading}
      results={results}
      features={features}
      onChange={setSearchValue}
      onClose={closeSearch}
      onSelect={handleSelectResult}
      />
    </BodyPortal>
  );

  // CEP opcional: o layout compacto (que só mostra o CEP até resolver) daria a impressão de que
  // ele é obrigatório — então tudo aberto, com a busca primeiro e o CEP por último.
  if (!requirePostalCode) {
    return (
      <>
        <div className={cn('space-y-4', className)}>
          {searchTrigger}
          {coordsField}
          {detailFields}
          {cepField}
        </div>

        {searchDrawer}
      </>
    );
  }

  if (layout === 'compact') {
    return (
      <CompactAddressForm
        className={className}
        cepField={cepField}
        searchTrigger={searchTrigger}
        coordsField={coordsField}
        detailFields={detailFields}
        searchDrawer={searchDrawer}
        resolved={resolved}
        summary={buildSearchValue(address) || 'Endereço incompleto'}
      />
    );
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {cepField}
        {searchTrigger}
        {coordsField}
        {detailFields}
      </div>

      {searchDrawer}
    </>
  );
}

// ============================================================
// COMPACT LAYOUT
// ============================================================

/**
 * `layout="compact"`: só o CEP fica visível por padrão. Depois de resolvido (ou editado), um
 * resumo de uma linha substitui o formulário inteiro — "Editar" abre um painel lateral (tela
 * inteira no mobile) com o restante dos campos, que por sua vez pode abrir o `SearchDrawer` por cima. Poupa espaço de
 * tela no step e evita a sensação de formulário longo.
 */
function CompactAddressForm({
  className,
  cepField,
  searchTrigger,
  coordsField,
  detailFields,
  searchDrawer,
  resolved,
  summary,
}: {
  className?: string;
  cepField: ReactNode;
  searchTrigger: ReactNode;
  coordsField: ReactNode;
  detailFields: ReactNode;
  searchDrawer: ReactNode;
  resolved: boolean;
  summary: string;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className={cn('space-y-3', className)}>
        {resolved ? (
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex w-full items-start gap-3 rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-[color:var(--ui-card-bg,var(--background))] shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] px-3.5 py-3 text-left transition-colors hover:bg-muted"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">Endereço de referência</span>
              <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
                {summary}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-primary">Editar</span>
          </button>
        ) : (
          <div className="space-y-3">
            {cepField}
            {searchTrigger}
            {coordsField}
          </div>
        )}
      </div>

      {editOpen && (
        <BodyPortal>
          <EditAddressDrawer onClose={() => setEditOpen(false)}>
            {cepField}
            {searchTrigger}
            {coordsField}
            {detailFields}
          </EditAddressDrawer>
        </BodyPortal>
      )}

      {searchDrawer}
    </>
  );
}

/**
 * Overlays vão direto para o `<body>`: dentro do wizard o conteúdo tem `transform`, e aí
 * `position: fixed` passa a valer em relação a ele — o painel abria preso na coluna do step.
 */
function BodyPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

/**
 * Painel lateral de edição: desliza da direita, 480px no desktop e tela inteira no mobile (mesmo
 * formato do `SearchDrawer`). Rodapé fixo com "Concluir" ao alcance do polegar; ESC e o fundo fecham.
 */
function EditAddressDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 motion-reduce:transition-none',
          entered ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar endereço"
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-background shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none sm:w-[480px]',
          entered ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Editar endereço</h2>
            <p className="text-xs text-muted-foreground">CEP, busca ou latitude e longitude</p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        <footer className="shrink-0 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--ui-radius-control,0.5rem)] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Concluir
          </button>
        </footer>
      </div>
    </div>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div>
      <label
        className="
        mb-1.5 block
        text-xs font-medium
        text-muted-foreground
      "
      >
        {label}
      </label>

      <input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value)}
        className={inputClass}
      />
    </div>
  );
}

// ============================================================
// SEARCH DRAWER
// ============================================================

function SearchDrawer({
  value,
  loading,
  results,
  features,
  onChange,
  onClose,
  onSelect,
}: {
  value: string;
  loading: boolean;
  results: AddressSearchResult[];
  features: AddressFeatureFlags;

  onChange: (value: string) => void;

  onClose: () => void;

  onSelect: (result: AddressSearchResult) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="
          absolute inset-0
          bg-black/30
          backdrop-blur-[1px]
        "
      />

      {/* DRAWER */}
      <div
        className="
          absolute inset-y-0 right-0
          flex w-full flex-col
          bg-background
          shadow-2xl

          sm:w-[480px]
        "
      >
        {/* HEADER */}
        <div
          className="
          flex h-16 shrink-0
          items-center justify-between
          border-b border-border
          px-5
        "
        >
          <div>
            <h2 className="text-sm font-semibold">Pesquisar localização</h2>

            <p
              className="
              text-xs
              text-muted-foreground
            "
            >
              Pesquise por endereço, cidade ou CEP
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex h-8 w-8
              items-center justify-center
              rounded-[var(--ui-radius-control,0.5rem)]
              text-muted-foreground
              hover:bg-muted
              hover:text-foreground
            "
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* CONTENT */}
        <div
          className="
          flex-1
          overflow-y-auto
          p-5
        "
        >
          {features.modalSearch && (
            <>
              {/* SEARCH */}
              <div className="relative">
                <Search
                  className="
                  absolute left-3 top-1/2
                  h-4 w-4
                  -translate-y-1/2
                  text-muted-foreground
                "
                />

                <input
                  autoFocus
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  placeholder="Nome do lugar, rua e número ou CEP..."
                  className="
                    h-11 w-full
                    rounded-[var(--ui-radius-card-compact,0.75rem)]
                    border border-border
                    bg-card
                    pl-10 pr-10
                    text-sm
                    outline-none
                    focus:border-primary
                  "
                />

                {loading && (
                  <Loader2
                    className="
                    absolute right-3 top-1/2
                    h-4 w-4
                    -translate-y-1/2
                    animate-spin
                    text-muted-foreground
                  "
                  />
                )}
              </div>

              {/* RESULTS */}
              <div className="mt-4 space-y-1">
                {results.map((result, index) => (
                  <button
                    key={result.id ?? `${index}-${result.formattedAddress}`}
                    type="button"
                    onClick={() => onSelect(result)}
                    className="
                        flex w-full
                        items-start
                        gap-3
                        rounded-[var(--ui-radius-card-compact,0.75rem)]
                        p-3
                        text-left
                        transition-colors
                        hover:bg-muted
                      "
                  >
                    <div
                      className="
                        mt-0.5
                        flex h-8 w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-primary/10
                        text-primary
                      "
                    >
                      <MapPin className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div
                        className="
                          truncate
                          text-sm
                          font-medium
                        "
                      >
                        {result.displayName?.text ?? result.formattedAddress ?? 'Localização'}
                      </div>

                      <div
                        className="
                          mt-0.5
                          line-clamp-2
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {result.formattedAddress}
                      </div>
                    </div>
                  </button>
                ))}

                {!loading && value.trim().length >= 3 && results.length === 0 && (
                  <div
                    className="
                      py-10
                      text-center
                    "
                  >
                    <MapPin
                      className="
                        mx-auto
                        h-6 w-6
                        text-muted-foreground
                      "
                    />

                    <p
                      className="
                        mt-2
                        text-sm
                        font-medium
                      "
                    >
                      Nenhum endereço encontrado
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">Tente pesquisar de outro jeito:</p>

                    <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-xs text-muted-foreground">
                      {ADDRESS_SEARCH_TIPS.map((tip) => (
                        <li key={tip.label} className="flex gap-2">
                          <span className="shrink-0 font-medium text-foreground">{tip.label}:</span>
                          <span className="min-w-0">{tip.example}</span>
                        </li>
                      ))}
                    </ul>

                    <p className="mt-3 text-xs text-muted-foreground">
                      Se ainda não achar, feche a busca e preencha os campos manualmente.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* LOCATION SELECTION */}
          {features.locationSelection && (
            <button
              type="button"
              className="
                mt-6
                flex w-full
                items-center
                gap-3
                rounded-[var(--ui-radius-card-compact,0.75rem)]
                border
                border-dashed
                border-border
                p-4
                text-left
                transition-colors
                hover:bg-muted
              "
            >
              <div
                className="
                flex h-9 w-9
                shrink-0
                items-center justify-center
                rounded-full
                bg-primary/10
                text-primary
              "
              >
                <Navigation className="h-4 w-4" />
              </div>

              <div>
                <div
                  className="
                  text-sm
                  font-medium
                "
                >
                  Selecionar localização
                </div>

                <div
                  className="
                  mt-0.5
                  text-xs
                  text-muted-foreground
                "
                >
                  Selecionar diretamente no mapa
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MINI MAP
// ============================================================

function MiniMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <div
      className="
      overflow-hidden
      rounded-xl
      border border-border
      bg-muted
    "
    >
      <div
        className="
        relative
        flex h-40
        items-center
        justify-center
      "
      >
        <div
          className="
          absolute inset-0
          opacity-30
          [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)]
          [background-size:24px_24px]
        "
        />

        <div
          className="
          relative
          z-10
          flex flex-col
          items-center
        "
        >
          <MapPin
            className="
            h-8 w-8
            fill-primary
            text-primary
          "
          />

          <span
            className="
            mt-1
            rounded-full
            bg-background/90
            px-2 py-1
            text-[10px]
            font-medium
            shadow-sm
          "
          >
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GOOGLE RESULT -> ADDRESS
// ============================================================

function parseGoogleResult(result: AddressSearchResult): AddressValue {
  const components = result.addressComponents ?? [];

  const get = (...types: string[]) => {
    const component = components.find((item) => types.some((type) => item.types?.includes(type)));

    return component?.longText ?? component?.shortText ?? '';
  };

  return {
    postalCode: get('postal_code'),

    street: get('route'),

    number: get('street_number'),

    complement: get('subpremise'),

    neighborhood: get('sublocality', 'sublocality_level_1', 'neighborhood'),

    city: get('locality', 'administrative_area_level_2'),

    state: get('administrative_area_level_1'),

    country: get('country') || 'BR',

    latitude: result.location?.latitude ?? null,

    longitude: result.location?.longitude ?? null,

    placeId: result.id ?? null,

    formattedAddress: result.formattedAddress ?? null,
  };
}

// ============================================================
// HELPERS
// ============================================================

function buildSearchValue(address: AddressValue) {
  return [
    address.street,
    address.number,
    address.neighborhood,
    address.city,
    address.state,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(', ');
}

function formatCep(value: string) {
  const clean = value.replace(/\D/g, '').slice(0, 8);

  if (clean.length <= 5) {
    return clean;
  }

  return `${clean.slice(0, 5)}-${clean.slice(5)}`;
}

const inputClass = `
  h-10 w-full
  rounded-[var(--ui-radius-select,0.5rem)]
  border border-border
  bg-background
  px-3
  text-sm
  outline-none
  transition-colors
  focus:border-primary
  disabled:cursor-not-allowed
  disabled:opacity-50
`;

/** Número de coordenada aceitando vírgula decimal ("-15,6014"); vazio/inválido → `null`. */
export function parseCoordinate(raw: string): number | null {
  const text = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** "-15.6014, -56.0979" (par colado do Google Maps) → ["-15.6014", "-56.0979"]; senão `null`. */
export function splitCoordinatePair(raw: string): [string, string] | null {
  const m = raw.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  return m ? [m[1], m[2]] : null;
}
