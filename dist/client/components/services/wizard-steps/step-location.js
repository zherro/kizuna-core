'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Building2, Home, Wifi } from 'lucide-react';
import { AddressForm, } from '../../ui-better-soft/google-form/address-google-form';
import { SERVICE_LOCATION_LABEL } from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';
const OPTIONS = [
    { value: 'no_cliente', icon: Home, desc: 'Você vai até o endereço do cliente.' },
    { value: 'no_estabelecimento', icon: Building2, desc: 'O cliente vai até o seu endereço.' },
    { value: 'remoto', icon: Wifi, desc: 'O serviço é feito à distância, sem atendimento presencial.' },
];
const initialAddress = {
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'BR',
    latitude: null,
    longitude: null,
    placeId: null,
    formattedAddress: null,
};
/**
 * Passo 3 — tipo de atendimento. Só `serviceLocation` é persistido; o endereço detalhado abaixo
 * é local (posiciona a UX, não vira coluna) — mesmo comportamento do wizard antigo.
 */
export function StepLocation({ state, patch }) {
    const value = state.serviceLocation ?? '';
    const [address, setAddress] = useState(initialAddress);
    const isPresential = value === 'no_cliente' || value === 'no_estabelecimento';
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Onde voc\u00EA atende?", subtitle: "Escolha o formato que combina com o seu servi\u00E7o.", why: "Isso define se o cliente te encontra por proximidade. Quem atende no endere\u00E7o do cliente aparece nas buscas da regi\u00E3o dele; quem atende \u00E0 dist\u00E2ncia aparece para todo o pa\u00EDs." }), _jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-3", children: OPTIONS.map((option) => {
                    const active = value === option.value;
                    const Icon = option.icon;
                    return (_jsxs("button", { type: "button", onClick: () => patch({ serviceLocation: option.value }), "data-active": active, className: "wz-selectable flex flex-col items-start gap-2 rounded-xl border bg-background p-4 text-left", children: [_jsx("div", { className: `grid h-9 w-9 place-items-center rounded-lg ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`, children: _jsx(Icon, { className: "h-5 w-5" }) }), _jsx("div", { className: "text-sm font-semibold text-foreground", children: SERVICE_LOCATION_LABEL[option.value] }), _jsx("div", { className: "text-xs text-muted-foreground", children: option.desc })] }, option.value));
                }) }), isPresential ? (_jsxs("div", { className: "space-y-3 border-t border-border pt-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-foreground", children: "Endere\u00E7o de refer\u00EAncia" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Usado s\u00F3 para posicionar voc\u00EA na busca por regi\u00E3o. O endere\u00E7o exato n\u00E3o aparece no an\u00FAncio." })] }), _jsx(AddressForm, { value: address, onChange: setAddress, features: { search: true, modalSearch: true, locationSelection: false, map: false } })] })) : null, value === 'remoto' ? (_jsx(StepHint, { tone: "info", children: "Servi\u00E7os \u00E0 dist\u00E2ncia aparecem para clientes de todo o pa\u00EDs, sem filtro de regi\u00E3o." })) : null] }));
}
//# sourceMappingURL=step-location.js.map