'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CalendarClock, MapPin, Save, Timer, UserCheck } from 'lucide-react';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ChoiceCard } from '../ui-better-soft/choice-card';
import { NumberField } from '../ui-better-soft/forms/number-field';
import { Section } from '../ui-better-soft/section';
import { ToggleRow } from '../ui-better-soft/toggle-row';
import { useTenantResource } from '../../hooks/use-tenant-resource';
import { DEFAULT_BOOKING_PREFERENCES } from './types';
const BOOKING_WINDOW_OPTIONS = [
    { days: 7, title: '1 semana', description: 'Agenda curta, mais controle. Até 7 dias à frente.' },
    { days: 15, title: '15 dias', description: 'Meio-termo, bom para a maioria.' },
    { days: 30, title: '30 dias', description: 'Máximo — clientes planejam com antecedência.' },
];
export function AgendaRulesSection() {
    const prefs = useTenantResource({
        resource: 'agenda_booking_preferences',
        defaultItems: [DEFAULT_BOOKING_PREFERENCES],
        loadErrorMessage: 'Não foi possível carregar as regras da agenda.',
        saveSuccessMessage: 'Regras da agenda salvas.',
    });
    const value = prefs.items[0] ?? DEFAULT_BOOKING_PREFERENCES;
    const patch = (key, next) => prefs.setItems([{ ...value, [key]: next }]);
    return (_jsx(Section, { icon: _jsx(Timer, { className: "h-4 w-4" }), title: "Regras gerais da agenda", description: "Valem para todos os seus hor\u00E1rios. Voc\u00EA pode mudar quando quiser.", children: _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold", children: [_jsx(CalendarClock, { className: "h-4 w-4 text-muted-foreground" }), "At\u00E9 quantos dias \u00E0 frente o cliente pode agendar?"] }), _jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-3", children: BOOKING_WINDOW_OPTIONS.map((o) => (_jsx(ChoiceCard, { selected: value.booking_window_days === o.days, onSelect: () => patch('booking_window_days', o.days), title: o.title, description: o.description, badge: value.booking_window_days === o.days ? 'Escolhido' : undefined }, o.days))) })] }), _jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-center gap-2 text-sm font-semibold", children: [_jsx(UserCheck, { className: "h-4 w-4 text-muted-foreground" }), "Quem escolhe o hor\u00E1rio do atendimento?"] }), _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2", children: [_jsx(ChoiceCard, { selected: value.client_picks_schedule, onSelect: () => patch('client_picks_schedule', true), title: "O cliente escolhe", description: "O cliente v\u00EA os hor\u00E1rios livres e j\u00E1 escolhe dia e hora ao pedir.", badge: "Mais r\u00E1pido" }), _jsx(ChoiceCard, { selected: !value.client_picks_schedule, onSelect: () => patch('client_picks_schedule', false), title: "Eu escolho ao fechar", description: "O cliente descreve o que precisa e voc\u00EA combina o hor\u00E1rio na confirma\u00E7\u00E3o.", badge: "Mais controle" })] })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 sm:grid-cols-2", children: [_jsx(NumberField, { label: "Anteced\u00EAncia m\u00EDnima", suffix: "horas", hint: "O cliente n\u00E3o agenda para daqui a menos de X horas.", value: value.min_advance_hours, min: 0, max: 72, onChange: (v) => patch('min_advance_hours', v) }), _jsx(NumberField, { label: "Intervalo entre atendimentos", suffix: "minutos", hint: "Folga entre um atendimento e o pr\u00F3ximo.", value: value.buffer_minutes, min: 0, max: 180, step: 5, onChange: (v) => patch('buffer_minutes', v) }), _jsx(NumberField, { label: "Raio de atendimento", suffix: "km", hint: "Dist\u00E2ncia m\u00E1xima que voc\u00EA aceita se deslocar.", icon: MapPin, value: value.service_radius_km, min: 1, max: 200, onChange: (v) => patch('service_radius_km', v) }), _jsx(ToggleRow, { title: "Aceitar automaticamente clientes recorrentes", subtitle: "Pedidos de quem voc\u00EA j\u00E1 atendeu entram direto na agenda.", checked: value.auto_accept_trusted, onChange: (v) => patch('auto_accept_trusted', v) })] }), _jsx("div", { className: "flex justify-end", children: _jsx(BsButton, { label: prefs.saving ? 'Salvando…' : 'Salvar regras', icon: Save, onClick: () => void prefs.save([value]), disabled: prefs.saving }) })] }) }));
}
//# sourceMappingURL=agenda-rules-section.js.map