'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminPageReader } from '../ui-better-soft/headers/admin-page-reader';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
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
    const openCreate = () => {
        setEditing(null);
        setSheetOpen(true);
    };
    const openEdit = (schedule) => {
        setEditing(schedule);
        setSheetOpen(true);
    };
    return (_jsxs("div", { className: "mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8", children: [_jsx(AdminPageReader, { title: "Hor\u00E1rios de atendimento", description: "Crie um ou mais hor\u00E1rios de atendimento e defina as regras da sua agenda.", backHref: "/painel/agenda", actions: schedules.length > 0 ? (_jsx(BsButton, { label: "Novo hor\u00E1rio", icon: Plus, onClick: openCreate })) : undefined }), _jsxs("div", { className: "space-y-6", children: [_jsx("section", { children: loading ? (_jsx("div", { className: "space-y-3", children: [0, 1].map((i) => (_jsx("div", { className: "h-20 animate-pulse rounded-2xl border border-border bg-muted/40" }, i))) })) : schedules.length === 0 ? (_jsx(SchedulesEmptyState, { onCreate: openCreate })) : (_jsx("ul", { className: "space-y-3", children: schedules.map((schedule) => (_jsx(ScheduleCard, { schedule: schedule, busy: saving, onEdit: () => openEdit(schedule), onDuplicate: () => void duplicateSchedule(schedule), onToggleActive: (active) => void setScheduleActive(schedule.id, active), onDelete: () => setPendingDelete(schedule) }, schedule.id))) })) }), _jsx(AgendaRulesSection, {}), _jsx(AgendaNotificationsSection, {})] }), _jsx(ScheduleSheet, { open: sheetOpen, editing: editing, saving: saving, timezone: DEFAULT_TZ, onClose: () => setSheetOpen(false), onSubmit: saveSchedule }), _jsx(ConfirmDialog, { open: Boolean(pendingDelete), title: "Excluir este hor\u00E1rio?", description: pendingDelete
                    ? `"${pendingDelete.name}" deixará de ficar disponível para novos agendamentos.`
                    : undefined, confirmLabel: "Excluir", loading: saving, onConfirm: () => {
                    if (pendingDelete)
                        void removeSchedule(pendingDelete.id);
                    setPendingDelete(null);
                }, onCancel: () => setPendingDelete(null) })] }));
}
//# sourceMappingURL=agenda-config-page.js.map