'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, X, ChevronRight, ChevronDown, Loader2, LocateFixed, Navigation, } from 'lucide-react';
import { useUserLocation } from '../hooks/use-user-location';
// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchStates() {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
    if (!res.ok)
        throw new Error();
    return res.json();
}
async function fetchCities(stateCode) {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios?orderBy=nome`);
    if (!res.ok)
        throw new Error();
    return res.json();
}
// ─── Trigger (parece select) ──────────────────────────────────────────────────
export function LocationTrigger({ onClick }) {
    const { location, status } = useUserLocation();
    const isDetecting = status === 'detecting';
    return (_jsxs("button", { onClick: onClick, disabled: isDetecting, "aria-label": "Selecionar localiza\u00E7\u00E3o", className: "inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-primary/5 px-2.5 text-[15px] font-medium text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60", children: [isDetecting ? (_jsx(Loader2, { className: "h-3.5 w-3.5 shrink-0 animate-spin text-primary" })) : (_jsx(MapPin, { className: "h-3.5 w-3.5 shrink-0 text-primary" })), _jsx("span", { className: "max-w-[150px] truncate", children: isDetecting ? (_jsx("span", { className: "text-muted-foreground", children: "Detectando..." })) : location ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "font-medium", children: location.cityName || location.stateName }), location.cityName && (_jsxs("span", { className: "text-muted-foreground", children: [", ", location.stateCode] })), location.source === 'ip' && (_jsx("span", { className: "ml-1 text-[10px] text-muted-foreground/70", children: "~" }))] })) : (_jsx("span", { className: "text-muted-foreground", children: "Selecionar local" })) }), _jsx(ChevronDown, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" })] }));
}
export function LocationModal({ open, onClose }) {
    const { location, setLocation, detectLocation, status } = useUserLocation();
    const overlayRef = useRef(null);
    const searchRef = useRef(null);
    const [step, setStep] = useState('state');
    const [search, setSearch] = useState('');
    const [detecting, setDetecting] = useState(false);
    const [states, setStates] = useState([]);
    const [statesLoading, setStatesLoading] = useState(false);
    const [statesError, setStatesError] = useState('');
    const [selectedState, setSelectedState] = useState(null);
    const [cities, setCities] = useState([]);
    const [citiesLoading, setCitiesLoading] = useState(false);
    const [citiesError, setCitiesError] = useState('');
    // Reset + carrega estados ao abrir
    useEffect(() => {
        if (!open)
            return;
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
        if (open)
            setTimeout(() => searchRef.current?.focus(), 60);
    }, [open, step]);
    // Escape fecha
    useEffect(() => {
        if (!open)
            return;
        const fn = (e) => {
            if (e.key === 'Escape')
                onClose();
        };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [open, onClose]);
    function handleOverlayClick(e) {
        if (e.target === overlayRef.current)
            onClose();
    }
    // Detectar localização de dentro do modal
    async function handleAutoDetect() {
        setDetecting(true);
        await detectLocation();
        setDetecting(false);
        // Se achou, fecha o modal
        if (status === 'found' || status === 'manual')
            onClose();
        // Se não achou (prompt), continua aberto para o usuário escolher
    }
    async function handleSelectState(state) {
        setSelectedState(state);
        setStep('city');
        setSearch('');
        setCitiesError('');
        setCitiesLoading(true);
        try {
            setCities(await fetchCities(state.sigla));
        }
        catch {
            setCitiesError('Não foi possível carregar as cidades.');
        }
        finally {
            setCitiesLoading(false);
        }
    }
    function handleSelectCity(city) {
        if (!selectedState)
            return;
        setLocation({
            stateCode: selectedState.sigla,
            stateName: selectedState.nome,
            cityId: city.id,
            cityName: city.nome,
            source: 'manual',
        });
        onClose();
    }
    const normalize = (s) => s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const q = normalize(search.trim());
    const filteredStates = q
        ? states.filter((s) => normalize(s.nome).includes(q) || normalize(s.sigla).includes(q))
        : states;
    const filteredCities = q ? cities.filter((c) => normalize(c.nome).includes(q)) : cities;
    if (!open)
        return null;
    return (_jsx("div", { ref: overlayRef, onClick: handleOverlayClick, className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm", children: _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": "Selecionar localiza\u00E7\u00E3o", className: "relative flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl", style: { maxHeight: '80vh' }, children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-4 py-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [step === 'city' && (_jsx("button", { onClick: () => {
                                        setStep('state');
                                        setSearch('');
                                    }, "aria-label": "Voltar", className: "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: _jsx(ChevronRight, { className: "h-4 w-4 rotate-180" }) })), _jsx(MapPin, { className: "h-4 w-4 text-primary" }), _jsx("span", { className: "text-sm font-semibold", children: step === 'state' ? 'Selecione o estado' : `${selectedState?.nome} — cidade` })] }), _jsx("button", { onClick: onClose, "aria-label": "Fechar", className: "rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground", children: _jsx(X, { className: "h-4 w-4" }) })] }), step === 'state' && (_jsx("div", { className: "border-b border-border bg-muted/40 px-4 py-3", children: _jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Navigation, { className: "h-3.5 w-3.5 shrink-0 text-primary" }), _jsx("span", { className: "text-xs text-muted-foreground", children: location ? (_jsxs(_Fragment, { children: ["Atual:", ' ', _jsxs("strong", { className: "text-foreground", children: [location.cityName || location.stateName, location.cityName ? `, ${location.stateCode}` : ''] }), location.source === 'ip' && ' (aproximado)'] })) : ('Detectar localização automaticamente') })] }), _jsx("button", { onClick: handleAutoDetect, disabled: detecting, className: "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60", children: detecting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-3 w-3 animate-spin" }), " Detectando..."] })) : (_jsxs(_Fragment, { children: [_jsx(LocateFixed, { className: "h-3 w-3" }), ' ', location ? 'Reatualizar' : 'Usar minha localização'] })) })] }) })), _jsx("div", { className: "border-b border-border px-3 py-2", children: _jsxs("div", { className: "flex items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring", children: [_jsx(Search, { className: "h-3.5 w-3.5 shrink-0 text-muted-foreground" }), _jsx("input", { ref: searchRef, value: search, onChange: (e) => setSearch(e.target.value), placeholder: step === 'state' ? 'Buscar estado...' : 'Buscar cidade...', className: "h-9 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" }), search && (_jsx("button", { onClick: () => setSearch(''), className: "text-muted-foreground hover:text-foreground", children: _jsx(X, { className: "h-3.5 w-3.5" }) }))] }) }), _jsxs("div", { className: "overflow-y-auto", children: [step === 'state' && (_jsxs(_Fragment, { children: [statesLoading && _jsx(LoadingRow, { label: "Carregando estados..." }), statesError && _jsx(ErrorRow, { label: statesError }), !statesLoading && !statesError && filteredStates.length === 0 && (_jsx(EmptyRow, { label: "Nenhum estado encontrado." })), !statesLoading &&
                                    !statesError &&
                                    filteredStates.map((state) => (_jsxs("button", { onClick: () => handleSelectState(state), className: "flex w-full items-center justify-between px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground", children: [_jsx("span", { children: state.nome }), _jsx("span", { className: "font-mono text-xs text-muted-foreground", children: state.sigla })] }, state.id)))] })), step === 'city' && (_jsxs(_Fragment, { children: [citiesLoading && _jsx(LoadingRow, { label: "Carregando cidades..." }), citiesError && _jsx(ErrorRow, { label: citiesError }), !citiesLoading && !citiesError && filteredCities.length === 0 && (_jsx(EmptyRow, { label: "Nenhuma cidade encontrada." })), !citiesLoading &&
                                    !citiesError &&
                                    filteredCities.map((city) => (_jsx("button", { onClick: () => handleSelectCity(city), className: "flex w-full items-center px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground", children: city.nome }, city.id)))] }))] })] }) }));
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function LoadingRow({ label }) {
    return (_jsxs("div", { className: "flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), " ", label] }));
}
function ErrorRow({ label }) {
    return _jsx("p", { className: "py-10 text-center text-sm text-destructive", children: label });
}
function EmptyRow({ label }) {
    return _jsx("p", { className: "py-10 text-center text-sm text-muted-foreground", children: label });
}
//# sourceMappingURL=location-modal.js.map