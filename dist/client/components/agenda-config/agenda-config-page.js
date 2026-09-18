'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CalendarClock, Plus, SlidersHorizontal, Bell } from 'lucide-react';
import { PageHeader } from '../ui-better-soft/headers/page-header';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAgendaSchedules } from './use-agenda-schedules';
import { ScheduleCard } from './schedule-card';
import { ScheduleSheet } from './schedule-sheet';
import { SchedulesEmptyState } from './schedules-empty-state';
import { AgendaRulesSection } from './agenda-rules-section';
import { AgendaNotificationsSection } from './agenda-notifications-section';
const DEFAULT_TZ = 'America/Sao_Paulo';
/**
 * `/painel/agenda/horarios` — the tenant's agenda configuration. A list of named weekly
 * schedules (each edited in a side Sheet) plus the two per-tenant singletons: general booking
 * rules and agenda notification preferences. Ships from the `agenda` plugin; a consuming
 * project just re-exports it from its route file.
 */
export function AgendaConfigPage() {
    const { schedules, loading, saving, saveSchedule, setScheduleActive, removeSchedule, duplicateSchedule, } = useAgendaSchedules();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [activeTab, setActiveTab] = useState('horarios');
    const openCreate = () => {
        setEditing(null);
        setSheetOpen(true);
    };
    const openEdit = (schedule) => {
        setEditing(schedule);
        setSheetOpen(true);
    };
    return (_jsxs("div", { className: "mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8", children: [_jsx(PageHeader, { title: "Configura\u00E7\u00E3o da agenda", description: "Hor\u00E1rios de atendimento, regras de reserva e notifica\u00E7\u00F5es \u2014 tudo em um s\u00F3 lugar.", backHref: "/painel/agenda", actions: activeTab === 'horarios' && schedules.length > 0 ? (_jsx(BsButton, { label: "Novo hor\u00E1rio", icon: Plus, onClick: openCreate })) : undefined }), _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full", children: [_jsxs(TabsList, { className: "grid h-auto w-full grid-cols-3 gap-1 p-1", children: [_jsxs(TabsTrigger, { value: "horarios", className: "flex flex-col items-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-1.5 sm:text-sm", children: [_jsx(CalendarClock, { className: "h-4 w-4 shrink-0" }), "Hor\u00E1rios"] }), _jsxs(TabsTrigger, { value: "regras", className: "flex flex-col items-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-1.5 sm:text-sm", children: [_jsx(SlidersHorizontal, { className: "h-4 w-4 shrink-0" }), "Regras"] }), _jsxs(TabsTrigger, { value: "notificacoes", className: "flex flex-col items-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-1.5 sm:text-sm", children: [_jsx(Bell, { className: "h-4 w-4 shrink-0" }), "Avisos"] })] }), _jsx(TabsContent, { value: "horarios", className: "space-y-3", children: loading ? (_jsx("div", { className: "space-y-3", children: [0, 1].map((i) => (_jsx("div", { className: "h-20 animate-pulse rounded-2xl border border-border bg-muted/40" }, i))) })) : schedules.length === 0 ? (_jsx(SchedulesEmptyState, { onCreate: openCreate })) : (_jsx("ul", { className: "space-y-3", children: schedules.map((schedule) => (_jsx(ScheduleCard, { schedule: schedule, busy: saving, onEdit: () => openEdit(schedule), onDuplicate: () => void duplicateSchedule(schedule), onToggleActive: (active) => void setScheduleActive(schedule.id, active), onDelete: () => setPendingDelete(schedule) }, schedule.id))) })) }), _jsx(TabsContent, { value: "regras", children: _jsx(AgendaRulesSection, {}) }), _jsx(TabsContent, { value: "notificacoes", children: _jsx(AgendaNotificationsSection, {}) })] }), _jsx(ScheduleSheet, { open: sheetOpen, editing: editing, saving: saving, timezone: DEFAULT_TZ, onClose: () => setSheetOpen(false), onSubmit: saveSchedule }), _jsx(ConfirmDialog, { open: Boolean(pendingDelete), title: "Excluir este hor\u00E1rio?", description: pendingDelete
                    ? `"${pendingDelete.name}" deixará de ficar disponível para novos agendamentos.`
                    : undefined, confirmLabel: "Excluir", loading: saving, onConfirm: () => {
                    if (pendingDelete)
                        void removeSchedule(pendingDelete.id);
                    setPendingDelete(null);
                }, onCancel: () => setPendingDelete(null) })] }));
}
//# sourceMappingURL=agenda-config-page.js.map