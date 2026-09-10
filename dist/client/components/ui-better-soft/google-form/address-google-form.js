'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, Navigation, Search, X } from 'lucide-react';
import { cn } from '../../../../lib/utils';
// ============================================================
// DEFAULTS
// ============================================================
const DEFAULT_FEATURES = {
    search: true,
    modalSearch: true,
    locationSelection: false,
    map: false,
};
// ============================================================
// COMPONENT
// ============================================================
export function AddressForm({ value, onChange, features: featureOverrides, disabled = false, className, }) {
    const features = useMemo(() => ({
        ...DEFAULT_FEATURES,
        ...featureOverrides,
    }), [featureOverrides]);
    const [address, setAddress] = useState({
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
    const [results, setResults] = useState([]);
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
    function updateAddress(changes) {
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
    async function handleCepChange(rawValue) {
        const postalCode = rawValue.replace(/\D/g, '').slice(0, 8);
        updateAddress({
            postalCode,
        });
        if (postalCode.length !== 8) {
            return;
        }
        await searchCep(postalCode);
    }
    async function searchCep(postalCode) {
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
        }
        catch (error) {
            console.error('Erro ao consultar CEP:', error);
        }
        finally {
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
    async function searchGoogle(query) {
        if (!features.modalSearch || query.trim().length < 3) {
            setResults([]);
            return;
        }
        try {
            setSearchLoading(true);
            const response = await fetch(`/api/location/address/search?q=${encodeURIComponent(query.trim())}`);
            if (!response.ok) {
                throw new Error('Erro ao pesquisar endereço');
            }
            const data = await response.json();
            setResults(data.places ?? []);
        }
        catch (error) {
            console.error('Erro ao pesquisar endereço:', error);
            setResults([]);
        }
        finally {
            setSearchLoading(false);
        }
    }
    // ============================================================
    // DEBOUNCE
    // ============================================================
    const searchTimer = useRef(null);
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
    function handleSelectResult(result) {
        const parsed = parseGoogleResult(result);
        updateAddress(parsed);
        closeSearch();
    }
    // ============================================================
    // FIELDS
    // ============================================================
    const fieldDisabled = disabled || !addressUnlocked;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: cn('space-y-4', className), children: [_jsxs("div", { children: [_jsx("label", { className: "mb-1.5 block text-xs font-medium text-muted-foreground", children: "CEP" }), _jsxs("div", { className: "relative", children: [_jsx("input", { value: formatCep(address.postalCode), onChange: (event) => handleCepChange(event.target.value), disabled: disabled, placeholder: "00000-000", inputMode: "numeric", className: cn(inputClass, 'pr-10') }), cepLoading && (_jsx(Loader2, { className: "\n                  absolute right-3 top-1/2\n                  h-4 w-4\n                  -translate-y-1/2\n                  animate-spin\n                  text-muted-foreground\n                " }))] })] }), features.search && (_jsxs("button", { type: "button", disabled: disabled, onClick: openSearch, className: "\n              inline-flex h-9\n              items-center gap-2\n              rounded-lg\n              border border-border\n              px-3\n              text-xs font-medium\n              text-foreground\n              transition-colors\n              hover:bg-muted\n              disabled:pointer-events-none\n              disabled:opacity-50\n            ", children: [_jsx(Search, { className: "h-4 w-4" }), "Pesquisar localiza\u00E7\u00E3o"] })), _jsxs("div", { className: "grid gap-4 sm:grid-cols-[1fr_140px]", children: [_jsx(Field, { label: "Endere\u00E7o", value: address.street, disabled: fieldDisabled, onChange: (value) => updateAddress({
                                    street: value,
                                }) }), _jsx(Field, { label: "N\u00FAmero", value: address.number, disabled: fieldDisabled, onChange: (value) => updateAddress({
                                    number: value,
                                }) })] }), _jsx(Field, { label: "Complemento", value: address.complement, disabled: fieldDisabled, onChange: (value) => updateAddress({
                            complement: value,
                        }) }), _jsx(Field, { label: "Bairro", value: address.neighborhood, disabled: fieldDisabled, onChange: (value) => updateAddress({
                            neighborhood: value,
                        }) }), _jsxs("div", { className: "grid grid-cols-[1fr_90px] gap-4", children: [_jsx(Field, { label: "Cidade", value: address.city, disabled: true }), _jsx(Field, { label: "UF", value: address.state, disabled: true })] }), address.latitude !== null && address.longitude !== null && (_jsxs("div", { className: "\n              flex items-center gap-2\n              rounded-lg\n              bg-muted/50\n              px-3 py-2\n              text-xs\n              text-muted-foreground\n            ", children: [_jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0" }), _jsx("span", { className: "truncate", children: address.formattedAddress ?? `${address.latitude}, ${address.longitude}` })] })), features.map && address.latitude !== null && address.longitude !== null && (_jsx(MiniMap, { latitude: address.latitude, longitude: address.longitude }))] }), searchOpen && (_jsx(SearchDrawer, { value: searchValue, loading: searchLoading, results: results, features: features, onChange: setSearchValue, onClose: closeSearch, onSelect: handleSelectResult }))] }));
}
// ============================================================
// FIELD
// ============================================================
function Field({ label, value, disabled, onChange, }) {
    return (_jsxs("div", { children: [_jsx("label", { className: "\n        mb-1.5 block\n        text-xs font-medium\n        text-muted-foreground\n      ", children: label }), _jsx("input", { value: value, disabled: disabled, onChange: (event) => onChange?.(event.target.value), className: inputClass })] }));
}
// ============================================================
// SEARCH DRAWER
// ============================================================
function SearchDrawer({ value, loading, results, features, onChange, onClose, onSelect, }) {
    return (_jsxs("div", { className: "fixed inset-0 z-[100]", children: [_jsx("button", { type: "button", "aria-label": "Fechar", onClick: onClose, className: "\n          absolute inset-0\n          bg-black/30\n          backdrop-blur-[1px]\n        " }), _jsxs("div", { className: "\n          absolute inset-y-0 right-0\n          flex w-full flex-col\n          bg-background\n          shadow-2xl\n\n          sm:w-[480px]\n        ", children: [_jsxs("div", { className: "\n          flex h-16 shrink-0\n          items-center justify-between\n          border-b border-border\n          px-5\n        ", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-sm font-semibold", children: "Pesquisar localiza\u00E7\u00E3o" }), _jsx("p", { className: "\n              text-xs\n              text-muted-foreground\n            ", children: "Pesquise por endere\u00E7o, cidade ou CEP" })] }), _jsx("button", { type: "button", onClick: onClose, className: "\n              flex h-8 w-8\n              items-center justify-center\n              rounded-lg\n              text-muted-foreground\n              hover:bg-muted\n              hover:text-foreground\n            ", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "\n          flex-1\n          overflow-y-auto\n          p-5\n        ", children: [features.modalSearch && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "\n                  absolute left-3 top-1/2\n                  h-4 w-4\n                  -translate-y-1/2\n                  text-muted-foreground\n                " }), _jsx("input", { autoFocus: true, value: value, onChange: (event) => onChange(event.target.value), placeholder: "\n                    Digite endere\u00E7o,\n                    cidade ou CEP...\n                  ", className: "\n                    h-11 w-full\n                    rounded-xl\n                    border border-border\n                    bg-card\n                    pl-10 pr-10\n                    text-sm\n                    outline-none\n                    focus:border-primary\n                  " }), loading && (_jsx(Loader2, { className: "\n                    absolute right-3 top-1/2\n                    h-4 w-4\n                    -translate-y-1/2\n                    animate-spin\n                    text-muted-foreground\n                  " }))] }), _jsxs("div", { className: "mt-4 space-y-1", children: [results.map((result, index) => (_jsxs("button", { type: "button", onClick: () => onSelect(result), className: "\n                        flex w-full\n                        items-start\n                        gap-3\n                        rounded-xl\n                        p-3\n                        text-left\n                        transition-colors\n                        hover:bg-muted\n                      ", children: [_jsx("div", { className: "\n                        mt-0.5\n                        flex h-8 w-8\n                        shrink-0\n                        items-center\n                        justify-center\n                        rounded-full\n                        bg-primary/10\n                        text-primary\n                      ", children: _jsx(MapPin, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "\n                          truncate\n                          text-sm\n                          font-medium\n                        ", children: result.displayName?.text ?? result.formattedAddress ?? 'Localização' }), _jsx("div", { className: "\n                          mt-0.5\n                          line-clamp-2\n                          text-xs\n                          text-muted-foreground\n                        ", children: result.formattedAddress })] })] }, result.id ?? `${index}-${result.formattedAddress}`))), !loading && value.trim().length >= 3 && results.length === 0 && (_jsxs("div", { className: "\n                      py-10\n                      text-center\n                    ", children: [_jsx(MapPin, { className: "\n                        mx-auto\n                        h-6 w-6\n                        text-muted-foreground\n                      " }), _jsx("p", { className: "\n                        mt-2\n                        text-sm\n                        font-medium\n                      ", children: "Nenhum endere\u00E7o encontrado" }), _jsx("p", { className: "\n                        mt-1\n                        text-xs\n                        text-muted-foreground\n                      ", children: "Tente informar mais detalhes." })] }))] })] })), features.locationSelection && (_jsxs("button", { type: "button", className: "\n                mt-6\n                flex w-full\n                items-center\n                gap-3\n                rounded-xl\n                border\n                border-dashed\n                border-border\n                p-4\n                text-left\n                transition-colors\n                hover:bg-muted\n              ", children: [_jsx("div", { className: "\n                flex h-9 w-9\n                shrink-0\n                items-center justify-center\n                rounded-full\n                bg-primary/10\n                text-primary\n              ", children: _jsx(Navigation, { className: "h-4 w-4" }) }), _jsxs("div", { children: [_jsx("div", { className: "\n                  text-sm\n                  font-medium\n                ", children: "Selecionar localiza\u00E7\u00E3o" }), _jsx("div", { className: "\n                  mt-0.5\n                  text-xs\n                  text-muted-foreground\n                ", children: "Selecionar diretamente no mapa" })] })] }))] })] })] }));
}
// ============================================================
// MINI MAP
// ============================================================
function MiniMap({ latitude, longitude }) {
    return (_jsx("div", { className: "\n      overflow-hidden\n      rounded-xl\n      border border-border\n      bg-muted\n    ", children: _jsxs("div", { className: "\n        relative\n        flex h-40\n        items-center\n        justify-center\n      ", children: [_jsx("div", { className: "\n          absolute inset-0\n          opacity-30\n          [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)]\n          [background-size:24px_24px]\n        " }), _jsxs("div", { className: "\n          relative\n          z-10\n          flex flex-col\n          items-center\n        ", children: [_jsx(MapPin, { className: "\n            h-8 w-8\n            fill-primary\n            text-primary\n          " }), _jsxs("span", { className: "\n            mt-1\n            rounded-full\n            bg-background/90\n            px-2 py-1\n            text-[10px]\n            font-medium\n            shadow-sm\n          ", children: [latitude.toFixed(5), ", ", longitude.toFixed(5)] })] })] }) }));
}
// ============================================================
// GOOGLE RESULT -> ADDRESS
// ============================================================
function parseGoogleResult(result) {
    const components = result.addressComponents ?? [];
    const get = (...types) => {
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
function buildSearchValue(address) {
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
function formatCep(value) {
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
//# sourceMappingURL=address-google-form.js.map