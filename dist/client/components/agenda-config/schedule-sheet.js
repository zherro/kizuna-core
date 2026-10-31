'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '../ui/button';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
import { ALL_DAYS, buildDefaultHour, mergeHoursByDay, } from './types';
import { ScheduleForm } from './schedule-form';
import { suggestScheduleName, validateSchedule } from './schedule-summary';
function cloneHours(source) {
    if (!source)
        return ALL_DAYS.map(buildDefaultHour);
    return mergeHoursByDay(source.hours.map((h) => ({ ...h })));
}
/**
 * Inner body — remounted fresh each time the sheet opens (keyed by the caller), so its draft
 * state is seeded once from props via `useState` initializers, no effects.
 */
function ScheduleSheetBody({ editing, saving, timezone, onClose, onSubmit, }) {
    const initial = useMemo(() => ({ name: editing?.name ?? '', hours: cloneHours(editing) }), [editing]);
    const [name, setName] = useState(initial.name);
    const [hours, setHours] = useState(initial.hours);
    const [nameTouched, setNameTouched] = useState(Boolean(editing));
    const [error, setError] = useState(null);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const effectiveName = nameTouched ? name : suggestScheduleName(hours);
    const dirty = JSON.stringify({ name: effectiveName, hours }) !== JSON.stringify(initial);
    const requestClose = () => {
        if (dirty)
            setConfirmDiscard(true);
        else
            onClose();
    };
    const handleSubmit = async () => {
        const check = validateSchedule(effectiveName, hours);
        if (!check.ok) {
            setError(check.message);
            return;
        }
        setError(null);
        const ok = await onSubmit({
            id: editing?.id,
            name: effectiveName,
            timezone: editing?.timezone ?? timezone,
            hours,
        });
        if (ok)
            onClose();
    };
    return (_jsxs(_Fragment, { children: [_jsx(ModalPanel, { open: true, onClose: requestClose, dismissible: false, wide: true, icon: _jsx(CalendarClock, { className: "h-4 w-4" }), title: editing ? 'Editar horário' : 'Novo horário', description: "Configure os dias e as faixas de atendimento desta disponibilidade.", headerFixed: true, footerFixed: true, footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: requestClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { type: "button", onClick: handleSubmit, disabled: saving, children: saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Aplicar disponibilidade' })] }), children: _jsx(ScheduleForm, { name: effectiveName, onNameChange: (v) => {
                        setNameTouched(true);
                        setName(v);
                    }, hours: hours, onHoursChange: setHours, errorMessage: error }) }), _jsx(ConfirmDialog, { open: confirmDiscard, title: "Descartar altera\u00E7\u00F5es?", description: "As mudan\u00E7as neste hor\u00E1rio ainda n\u00E3o foram salvas.", confirmLabel: "Descartar", cancelLabel: "Continuar editando", onConfirm: () => {
                    setConfirmDiscard(false);
                    onClose();
                }, onCancel: () => setConfirmDiscard(false) })] }));
}
export function ScheduleSheet({ open, ...rest }) {
    if (!open)
        return null;
    return _jsx(ScheduleSheetBody, { ...rest }, rest.editing?.id ?? 'new');
}
//# sourceMappingURL=schedule-sheet.js.map