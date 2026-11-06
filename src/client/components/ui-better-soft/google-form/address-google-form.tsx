'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Crosshair, Loader2, MapPin, Navigation, Plus, Search, X } from 'lucide-react';

import { cn } from '../../../../lib/utils';
import { SearchableSelect, type SelectOption } from '../../ui/searchable-select';

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
  /** Código IBGE da cidade, quando conhecido (CEP ou cidade escolhida na lista). */
  cityIbge?: string | null;
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
   * `'compact'`: na tela fica só o resumo do endereço (ou um card "Adicionar endereço", vazio);
   * CEP, busca, coordenadas e os campos ficam no painel de edição — lateral no desktop, tela
   * cheia com rodapé fixo no mobile. `'full'` (padrão): todos os campos na tela.
   */
  layout?: 'full' | 'compact';

  /**
   * Compacto dentro de um card que já tem borda (ex.: lista de endereços): o resumo sai sem a
   * própria borda/sombra. Default `false`.
   */
  bare?: boolean;

  /** Compacto: abre o painel de edição ao montar (ex.: linha recém-adicionada numa lista). */
  autoOpen?: boolean;

  /** Label for the search trigger. Defaults to "Pesquisar localização". */
  searchLabel?: string;

  /** Destaca o CEP (rótulo forte e campo maior) como campo principal. Default `false`. */
  emphasizeCep?: boolean;

  /**
   * `false`: CEP opcional — os campos de rua/número/bairro já vêm liberados (sem esperar CEP ou
   * busca) e o rótulo vira "CEP (opcional)"; cidade e UF são escolhidas numa lista. Default `true`.
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
  bare = false,
  autoOpen = false,
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

    state: toUf(value?.state ?? ''),

    cityIbge: value?.cityIbge ?? null,

    country: value?.country ?? 'BR',

    latitude: value?.latitude ?? null,

    longitude: value?.longitude ?? null,

    placeId: value?.placeId ?? null,

    formattedAddress: value?.formattedAddress ?? null,
  });

  const [cepLoading, setCepLoading] = useState(false);
  // CEP não encontrado ou consulta fora do ar: libera os campos e a escolha da cidade na lista.
  const [cepStatus, setCepStatus] = useState<CepStatus>('idle');
  const cepFailed = cepStatus === 'not_found' || cepStatus === 'unavailable';
  const cepError = cepFailed ? cepErrorMessage(cepStatus, address.postalCode) : null;
  const manualCity = cepFailed;

  // Layout compacto: painel lateral onde o endereço é completado (abre sozinho após CEP/coordenadas).
  const [editOpen, setEditOpen] = useState(layout === 'compact' && autoOpen);
  // Lista de cidades fora do ar: a cidade vira texto livre, e basta estar preenchida.
  const [cityListFailed, setCityListFailed] = useState(false);

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

    return !requirePostalCode || manualCity || cep.length === 8 || address.latitude !== null;
  }, [requirePostalCode, manualCity, address.postalCode, address.latitude]);

  // ============================================================
  // UPDATE
  // ============================================================

  // Último valor, fora do ciclo de render: duas atualizações seguidas (CEP e depois os dados dele)
  // se somam, e o `onChange` do pai roda fora do updater do setState (chamar lá dentro fazia o React
  // reclamar de "update a component while rendering a different component").
  const latestRef = useRef(address);

  function updateAddress(changes: Partial<AddressValue>) {
    const current = latestRef.current;
    // Cidade/UF mudaram sem código novo: o IBGE antigo deixa de valer (o salvar descobre de novo).
    const cityChanged =
      !('cityIbge' in changes) &&
      ((changes.city !== undefined && changes.city !== current.city) ||
        (changes.state !== undefined && changes.state !== current.state));
    const next = {
      ...current,
      ...changes,
      ...(cityChanged ? { cityIbge: null } : {}),
    };
    latestRef.current = next;
    setAddress(next);
    onChange?.(next);
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
      setCepStatus('idle');
      return;
    }

    await searchCep(postalCode);
    // Achando ou não, o restante do endereço é completado no painel lateral.
    if (layout === 'compact') setEditOpen(true);
  }

  async function searchCep(postalCode: string) {
    try {
      setCepLoading(true);
      setCepStatus('loading');

      // Pela rota do servidor (plugin location): não depende do navegador alcançar o ViaCEP.
      const response = await fetch(`/api/location/cep?cep=${postalCode}`, { cache: 'no-store' });
      const data = (await response.json().catch(() => null)) as {
        street?: string;
        neighborhood?: string;
        city?: string;
        state?: string;
        ibge?: string;
      } | null;

      // 404 = o CEP não existe; qualquer outra falha = a consulta não respondeu.
      if (response.status === 404) {
        setCepStatus('not_found');
        return;
      }
      if (!response.ok || !data?.city) {
        setCepStatus('unavailable');
        return;
      }

      updateAddress({
        postalCode,
        street: data.street ?? '',
        neighborhood: data.neighborhood ?? '',
        city: data.city,
        state: toUf(String(data.state ?? '')),
        cityIbge: String(data.ibge ?? '').replace(/\D/g, '') || null,
        country: 'BR',
      });
      setCepStatus('found');
    } catch {
      setCepStatus('unavailable');
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
        state: toUf(data.state ?? ''),
        ...(data.zipCode && data.zipCode.length === 8 ? { postalCode: data.zipCode } : {}),
      });
    } catch {
      setCoordsError('Coordenadas salvas, mas não foi possível consultar a cidade agora.');
    } finally {
      setCoordsLoading(false);
      // Achando ou não a cidade, o restante do endereço é completado no painel lateral.
      if (layout === 'compact') {
        setCoordsOpen(false);
        setEditOpen(true);
      }
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
    // "Não sei meu CEP": o lugar escolhido é completado (número, cidade) no painel lateral.
    if (layout === 'compact') setEditOpen(true);
  }

  // ============================================================
  // FIELDS
  // ============================================================

  // No painel lateral tudo já vem liberado (ele só abre depois do CEP, das coordenadas ou do resumo).
  const fieldDisabled = disabled || (layout !== 'compact' && !addressUnlocked);
  const resolved = Boolean(address.street.trim() || address.city.trim());
  // Cidade obrigatória: escolhida na lista (com IBGE) ou, com a lista fora do ar, digitada.
  const cityOk = Boolean(address.cityIbge) || (cityListFailed && Boolean(address.city.trim() && address.state));

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

      {cepError && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {cepError}
        </p>
      )}
    </div>
  );

  const searchTrigger = (label: string) => features.search && (
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
      {label}
    </button>
  );

  const coordsField = (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={coordsOpen}
        onClick={() => setCoordsOpen((open) => !open)}
        className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50"
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
      {/* Com CEP, cidade/UF vêm dele (ou da busca). Sem CEP obrigatório, ou se o CEP falhou, a
          cidade é escolhida na lista — já com o código IBGE, que a busca usa para achar o anúncio. */}
      {layout === 'compact' || !requirePostalCode || manualCity ? (
        <CityStatePicker
          city={address.city}
          state={address.state}
          cityIbge={address.cityIbge ?? null}
          // CEP achado: cidade e UF são as dele.
          disabled={disabled || (cepStatus === 'found' && Boolean(address.cityIbge))}
          missing={editOpen && resolved && !cityOk}
          onListFailedChange={setCityListFailed}
          onChange={(changes) => updateAddress(changes)}
        />
      ) : (
        <div className="grid grid-cols-[1fr_90px] gap-4">
          <Field label="Cidade" value={address.city} disabled />
          <Field label="UF" value={address.state} disabled />
        </div>
      )}

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

  if (layout === 'compact') {
    // CEP achado já vem com o erro dele no próprio campo (role=alert); aqui só o das coordenadas.
    const notice = coordsError;
    const hasAddress = resolved || cepFailed || Boolean(address.postalCode);
    // O card diz o que falta (o Concluir do painel exige a cidade; o passo exige rua e número).
    const missing = [
      requirePostalCode && address.postalCode.replace(/\D/g, '').length !== 8 ? 'CEP' : null,
      !address.street.trim() ? 'rua' : null,
      !address.number.trim() ? 'número' : null,
      !cityOk ? 'cidade' : null,
    ].filter((m): m is string => m !== null);
    const summaryWarning = missing.length
      ? `Falta ${missing.length > 1 ? `${missing.slice(0, -1).join(', ')} e ${missing.at(-1)}` : missing[0]}`
      : null;
    return (
      <>
        <div className={className}>
          {hasAddress ? (
            <AddressSummary
              address={address}
              warning={summaryWarning}
              disabled={disabled}
              bare={bare}
              onEdit={() => setEditOpen(true)}
            />
          ) : (
            <AddAddressCard
              hint={requirePostalCode ? 'Pelo CEP ou pesquisando o local' : 'Pesquise o local ou informe o CEP'}
              disabled={disabled}
              bare={bare}
              onAdd={() => setEditOpen(true)}
            />
          )}
        </div>

        {editOpen && (
          <BodyPortal>
            <EditAddressDrawer
              title={hasAddress ? 'Editar endereço' : 'Adicionar endereço'}
              subtitle={requirePostalCode ? 'Digite o CEP ou pesquise o local' : 'Pesquise o local ou digite o CEP'}
              canFinish={cityOk}
              showBlocker={resolved}
              onClose={() => setEditOpen(false)}
              notice={
                notice ? (
                  <p
                    role="status"
                    className="rounded-[var(--ui-radius-card-compact,0.75rem)] border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
                  >
                    {notice}
                  </p>
                ) : null
              }
            >
              {/* CEP opcional (ex.: eventos): o caminho mais comum é pesquisar o local, então a busca vem antes. */}
              {requirePostalCode ? cepField : searchTrigger(searchLabel)}
              {requirePostalCode ? searchTrigger(searchLabel) : cepField}
              {coordsField}
              <div className="space-y-4 border-t border-border pt-4">{detailFields}</div>
            </EditAddressDrawer>
          </BodyPortal>
        )}

        {searchDrawer}
      </>
    );
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {cepField}
        {searchTrigger(searchLabel)}
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

/** Linhas do resumo, no formato de etiqueta: rua e número / complemento e bairro / CEP e cidade. */
export function addressSummaryLines(address: Partial<AddressValue>): [string, string, string] {
  const street = address.street?.trim() ?? '';
  const number = address.number?.trim() ?? '';
  const city = address.city?.trim() ?? '';
  const uf = address.state?.trim() ?? '';
  const cep = (address.postalCode ?? '').replace(/\D/g, '');
  const line1 = street ? (number ? `${street}, ${number}` : street) : address.formattedAddress?.trim() || '';
  const line2 = [address.complement?.trim(), address.neighborhood?.trim()].filter(Boolean).join(', ');
  const cityUf = [city, uf].filter(Boolean).join(' - ');
  const line3 = [cep.length === 8 ? `CEP ${formatCep(cep)}` : '', cityUf].filter(Boolean).join(', ');
  return [line1, line2, line3];
}

/**
 * `layout="compact"`: na tela fica só este resumo (estilo etiqueta de entrega). Ele inteiro é o
 * botão que abre o painel de edição.
 */
function AddressSummary({
  address,
  warning,
  disabled,
  bare,
  onEdit,
}: {
  address: AddressValue;
  warning: string | null;
  disabled?: boolean;
  bare?: boolean;
  onEdit: () => void;
}) {
  const [line1, line2, line3] = addressSummaryLines(address);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onEdit}
      className={cn(
        'group flex w-full items-start gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        bare
          ? 'rounded-[var(--ui-radius-control,0.5rem)]'
          : 'rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] bg-[color:var(--ui-card-bg,var(--background))] px-3.5 py-3 shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] hover:bg-muted/60',
        !bare && (warning ? 'border-warning' : 'border-border')
      )}
    >
      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <MapPin className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
          {line1 || 'Endereço sem rua'}
        </span>
        {line2 && <span className="block text-sm leading-snug text-muted-foreground [overflow-wrap:anywhere]">{line2}</span>}
        {line3 && <span className="block text-sm leading-snug text-muted-foreground [overflow-wrap:anywhere]">{line3}</span>}
        {warning && (
          <span className="mt-1.5 inline-flex rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium text-foreground">
            {warning}
          </span>
        )}
      </span>
      <span className="shrink-0 pt-0.5 text-sm font-medium text-primary group-hover:underline underline-offset-2">
        Editar
      </span>
    </button>
  );
}

/** Compacto sem endereço: um card só, que abre o painel. */
function AddAddressCard({
  hint,
  disabled,
  bare,
  onAdd,
}: {
  hint: string;
  disabled?: boolean;
  bare?: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onAdd}
      className={cn(
        'flex w-full items-center gap-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
        bare
          ? 'rounded-[var(--ui-radius-control,0.5rem)]'
          : 'rounded-[var(--ui-radius-card-compact,0.75rem)] border border-dashed border-border px-3.5 py-3 hover:border-primary/60 hover:bg-muted/60'
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Plus className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Informar endereço</span>
        <span className="block text-sm text-muted-foreground">{hint}</span>
      </span>
    </button>
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
function EditAddressDrawer({
  title: initialTitle,
  subtitle,
  onClose,
  canFinish,
  showBlocker,
  notice,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  /** Mostra por que "Concluir" está bloqueado — só depois que há endereço (vazio não é erro). */
  showBlocker: boolean;
  /** `false`: "Concluir" bloqueado — falta escolher a cidade. */
  canFinish: boolean;
  /** Aviso no topo (CEP não encontrado, consulta fora do ar…). */
  notice?: ReactNode;
  children: ReactNode;
}) {
  const [entered, setEntered] = useState(false);
  // Título de quando abriu: digitar o CEP não troca "Adicionar" por "Editar" no meio da edição.
  const [title] = useState(initialTitle);
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
        aria-label={title}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col bg-background shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none sm:w-[480px]',
          entered ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
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
        <div
          // Campo focado perto do rodapé (cidade/UF abrem a lista para baixo; no celular o teclado sobe):
          // traz para o meio da área rolável, senão a lista some atrás do rodapé fixo.
          onFocus={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const field = (event.target as HTMLElement).getBoundingClientRect();
            if (field.bottom > box.top + box.height * 0.55) {
              event.target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
            }
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-40 pt-5"
        >
          {notice}
          {children}
        </div>
        <footer className="shrink-0 space-y-2 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {!canFinish && showBlocker && (
            <p className="text-center text-xs font-medium text-destructive">Escolha a cidade para concluir.</p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={!canFinish}
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--ui-radius-control,0.5rem)] bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
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

const UF_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo',
  SE: 'Sergipe', TO: 'Tocantins',
};

// Rótulo com sigla + nome: "mt" e "mato" acham o estado na pesquisa.
const STATES_BR: SelectOption[] = Object.entries(UF_NAMES).map(([uf, name]) => ({
  value: uf,
  label: `${uf} · ${name}`,
}));

const normalizeCityName = (v: string) =>
  v.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();

/** Sigla da UF a partir da sigla ou do nome ("Mato Grosso", como o Google devolve); senão, o texto. */
export function toUf(state: string): string {
  const text = state.trim();
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase();
  const name = normalizeCityName(text.replace(/^(estado d[eoa]s?)\s+/i, ''));
  const hit = Object.entries(UF_NAMES).find(([, n]) => normalizeCityName(n) === name);
  return hit ? hit[0] : text;
}

type CepStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'unavailable';

function cepErrorMessage(status: CepStatus, postalCode: string): string {
  const cep = formatCep(postalCode);
  return status === 'not_found'
    ? `O CEP ${cep} não foi encontrado. Confira os números ou preencha o endereço e escolha a cidade.`
    : `Não foi possível consultar o CEP ${cep} agora (o serviço de CEP não respondeu). Preencha o endereço e escolha a cidade.`;
}

/** UF + cidade em listas pesquisáveis; a cidade vem de /api/location/cities (valor = código IBGE). */
function CityStatePicker({
  city,
  state,
  cityIbge,
  disabled,
  missing,
  onListFailedChange,
  onChange,
}: {
  city: string;
  state: string;
  cityIbge: string | null;
  disabled?: boolean;
  /** Cidade obrigatória ainda não escolhida: destaca o campo e explica. */
  missing?: boolean;
  onListFailedChange?: (failed: boolean) => void;
  onChange: (changes: Partial<AddressValue>) => void;
}) {
  const ufId = useId();
  const cityId = useId();
  const uf = toUf(state);
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  // Lista fora do ar: volta para texto livre (o banco acha o IBGE pelo nome, services 0017).
  const [listFailed, setListFailed] = useState(false);

  useEffect(() => {
    if (!/^[A-Z]{2}$/.test(uf)) {
      setOptions([]);
      return;
    }
    let alive = true;
    setLoading(true);
    fetch(`/api/location/cities?uf=${uf}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: Array<{ value?: unknown; label?: unknown }> } | null) => {
        if (!alive) return;
        setListFailed(!data);
        setOptions(
          (data?.items ?? [])
            .filter((i) => i.value != null && typeof i.label === 'string')
            .map((i) => ({ value: String(i.value), label: String(i.label) }))
        );
      })
      .catch(() => {
        if (alive) {
          setOptions([]);
          setListFailed(true);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [uf]);

  useEffect(() => {
    onListFailedChange?.(listFailed);
  }, [listFailed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Endereço antigo ou vindo da busca/coordenadas (só o nome da cidade): acha a opção pelo nome.
  const byIbge = cityIbge && options.some((o) => o.value === cityIbge) ? cityIbge : null;
  const byName = options.find((o) => normalizeCityName(o.label) === normalizeCityName(city));
  const selected = byIbge ?? byName?.value ?? '';

  // Achou pelo nome: grava o código IBGE (é ele que põe o anúncio na busca e libera o "Concluir").
  useEffect(() => {
    if (!byIbge && byName) onChange({ city: byName.label, cityIbge: byName.value });
  }, [byIbge, byName?.value]); // eslint-disable-line react-hooks/exhaustive-deps

  // UF que não é sigla (dado antigo): mostra vazia para escolher de novo.
  const ufValue = UF_NAMES[uf] ? uf : '';
  const cityMissing = Boolean(missing) && !listFailed && Boolean(ufValue) && !loading && !selected;
  const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground';

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div>
        <label htmlFor={ufId} className={labelClass}>
          UF
        </label>
        <SearchableSelect
          id={ufId}
          value={ufValue}
          options={STATES_BR}
          placeholder="Selecione o estado"
          disabled={disabled}
          onChange={(value) => {
            if (value !== ufValue) onChange({ state: value, city: '', cityIbge: null });
          }}
        />
      </div>
      {listFailed ? (
        <Field label="Cidade" value={city} disabled={disabled} onChange={(value) => onChange({ city: value })} />
      ) : (
        <div>
          <label htmlFor={cityId} className={labelClass}>
            Cidade
          </label>
          <SearchableSelect
            id={cityId}
            value={selected}
            options={options}
            disabled={disabled || !ufValue}
            placeholder={!ufValue ? 'Escolha o estado primeiro' : loading ? 'Carregando cidades...' : 'Selecione a cidade'}
            className={cn(cityMissing && '[&>button]:border-destructive')}
            onChange={(value) =>
              onChange({ city: options.find((o) => o.value === value)?.label ?? '', cityIbge: value || null })
            }
          />
          {cityMissing && (
            <p className="mt-1.5 text-xs text-destructive">
              {city.trim()
                ? `Não achamos "${city.trim()}" na lista de ${UF_NAMES[ufValue]}. Escolha a cidade.`
                : 'Escolha a cidade na lista.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

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
  // Rótulo ligado ao campo: leitor de tela anuncia "Número", e tocar no rótulo foca o input.
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className="
        mb-1.5 block
        text-xs font-medium
        text-muted-foreground
      "
      >
        {label}
      </label>

      <input
        id={id}
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

    // O Google manda o nome por extenso em longText ("Mato Grosso"); a lista de cidades precisa da sigla.
    state: toUf(
      components.find((item) => item.types?.includes('administrative_area_level_1'))?.shortText ??
        get('administrative_area_level_1')
    ),

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
