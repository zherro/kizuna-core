'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react';

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

export function AddressForm({
  value,
  onChange,
  features: featureOverrides,
  disabled = false,
  className,
}: AddressFormProps) {
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

  // ============================================================
  // UNLOCK
  // ============================================================

  const addressUnlocked = useMemo(() => {
    const cep = address.postalCode.replace(/\D/g, '');

    return cep.length === 8 || address.latitude !== null;
  }, [address.postalCode, address.latitude]);

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

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* CEP */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">CEP</label>

          <div className="relative">
            <input
              value={formatCep(address.postalCode)}
              onChange={(event) => handleCepChange(event.target.value)}
              disabled={disabled}
              placeholder="00000-000"
              inputMode="numeric"
              className={cn(inputClass, 'pr-10')}
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

        {/* SEARCH */}
        {features.search && (
          <button
            type="button"
            disabled={disabled}
            onClick={openSearch}
            className="
              inline-flex h-9
              items-center gap-2
              rounded-lg
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
            Pesquisar localização
          </button>
        )}

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
          <Field label="Cidade" value={address.city} disabled />

          <Field label="UF" value={address.state} disabled />
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
      </div>

      {/* DRAWER */}
      {searchOpen && (
        <SearchDrawer
          value={searchValue}
          loading={searchLoading}
          results={results}
          features={features}
          onChange={setSearchValue}
          onClose={closeSearch}
          onSelect={handleSelectResult}
        />
      )}
    </>
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
              rounded-lg
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
                  placeholder="
                    Digite endereço,
                    cidade ou CEP...
                  "
                  className="
                    h-11 w-full
                    rounded-xl
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
                        rounded-xl
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

                    <p
                      className="
                        mt-1
                        text-xs
                        text-muted-foreground
                      "
                    >
                      Tente informar mais detalhes.
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
                rounded-xl
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
  rounded-lg
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
