'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
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
export function ScheduleSheet({ open, editing, saving, timezone, onClose, onSubmit, }) {
    const [name, setName] = useState('');
    const [hours, setHours] = useState(() => cloneHours(null));
    const [nameTouched, setNameTouched] = useState(false);
    const [error, setError] = useState(null);
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const initial = useMemo(() => ({ name: editing?.name ?? '', hours: cloneHours(editing) }), [editing]);
    // reset draft each time the sheet opens
    useEffect(() => {
        if (!open)
            return;
        setName(initial.name);
        setHours(initial.hours);
        setNameTouched(Boolean(editing));
        setError(null);
        setConfirmDiscard(false);
    }, [open, initial, editing]);
    // auto-suggest a name until the user edits it
    useEffect(() => {
        if (nameTouched)
            return;
        setName(suggestScheduleName(hours));
    }, [hours, nameTouched]);
    const dirty = useMemo(() => JSON.stringify({ name, hours }) !== JSON.stringify(initial), [name, hours, initial]);
    const requestClose = () => {
        if (dirty)
            setConfirmDiscard(true);
        else
            onClose();
    };
    const handleSubmit = async () => {
        const check = validateSchedule(name, hours);
        if (!check.ok) {
            setError(check.message);
            return;
        }
        setError(null);
        const ok = await onSubmit({ id: editing?.id, name, timezone: editing?.timezone ?? timezone, hours });
        if (ok)
            onClose();
    };
    return (_jsxs(_Fragment, { children: [_jsx(ModalPanel, { open: open, onClose: requestClose, dismissible: false, wide: true, icon: _jsx(CalendarClock, { className: "h-4 w-4" }), title: editing ? 'Editar horário' : 'Novo horário', description: "Configure os dias e as faixas de atendimento desta disponibilidade.", headerFixed: true, footerFixed: true, footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: requestClose, disabled: saving, children: "Cancelar" }), _jsx(Button, { type: "button", onClick: handleSubmit, disabled: saving, children: saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Aplicar disponibilidade' })] }), children: _jsx(ScheduleForm, { name: name, onNameChange: (v) => {
                        setNameTouched(true);
                        setName(v);
                    }, hours: hours, onHoursChange: setHours, errorMessage: error }) }), _jsx(ConfirmDialog, { open: confirmDiscard, title: "Descartar altera\u00E7\u00F5es?", description: "As mudan\u00E7as neste hor\u00E1rio ainda n\u00E3o foram salvas.", confirmLabel: "Descartar", cancelLabel: "Continuar editando", onConfirm: () => {
                    setConfirmDiscard(false);
                    onClose();
                }, onCancel: () => setConfirmDiscard(false) })] }));
}
//# sourceMappingURL=schedule-sheet.js.map