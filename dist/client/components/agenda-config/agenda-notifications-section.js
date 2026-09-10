'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bell, Save } from 'lucide-react';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { NumberField } from '../ui-better-soft/forms/number-field';
import { Section } from '../ui-better-soft/section';
import { ToggleRow } from '../ui-better-soft/toggle-row';
import { useTenantResource } from '../../hooks/use-tenant-resource';
import { DEFAULT_NOTIFICATION_PREFERENCES } from './types';
export function AgendaNotificationsSection() {
    const prefs = useTenantResource({
        resource: 'agenda_notification_preferences',
        defaultItems: [DEFAULT_NOTIFICATION_PREFERENCES],
        loadErrorMessage: 'Não foi possível carregar as notificações da agenda.',
        saveSuccessMessage: 'Notificações da agenda salvas.',
    });
    const value = prefs.items[0] ?? DEFAULT_NOTIFICATION_PREFERENCES;
    const patch = (key, next) => prefs.setItems([{ ...value, [key]: next }]);
    return (_jsx(Section, { icon: _jsx(Bell, { className: "h-4 w-4" }), title: "Notifica\u00E7\u00F5es da agenda", description: "Quando e como voc\u00EA quer ser avisado sobre a sua agenda.", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2.5", children: [_jsx(ToggleRow, { title: "Novo agendamento", subtitle: "Avisar quando um cliente marcar um hor\u00E1rio.", checked: value.notify_new_booking, onChange: (v) => patch('notify_new_booking', v) }), _jsx(ToggleRow, { title: "Cancelamento", subtitle: "Avisar quando um agendamento for cancelado.", checked: value.notify_cancellation, onChange: (v) => patch('notify_cancellation', v) }), _jsx(ToggleRow, { title: "Lembrete de atendimento", subtitle: "Lembrar voc\u00EA antes de cada atendimento.", checked: value.notify_reminder, onChange: (v) => patch('notify_reminder', v) })] }), value.notify_reminder ? (_jsx(NumberField, { label: "Enviar lembrete com anteced\u00EAncia de", suffix: "horas", value: value.reminder_hours_before, min: 1, max: 72, onChange: (v) => patch('reminder_hours_before', v) })) : null, _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-sm font-semibold", children: "Canais" }), _jsxs("div", { className: "space-y-2.5", children: [_jsx(ToggleRow, { title: "E-mail", checked: value.channel_email, onChange: (v) => patch('channel_email', v) }), _jsx(ToggleRow, { title: "Notifica\u00E7\u00E3o no app", checked: value.channel_push, onChange: (v) => patch('channel_push', v) }), _jsx(ToggleRow, { title: "WhatsApp", checked: value.channel_whatsapp, onChange: (v) => patch('channel_whatsapp', v) })] })] }), _jsx("div", { className: "flex justify-end", children: _jsx(BsButton, { label: prefs.saving ? 'Salvando…' : 'Salvar notificações', icon: Save, onClick: () => void prefs.save([value]), disabled: prefs.saving }) })] }) }));
}
//# sourceMappingURL=agenda-notifications-section.js.map