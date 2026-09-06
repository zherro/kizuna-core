'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CalendarDays, Utensils } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { InlineAlert } from '../ui-better-soft/inline-alert';
import { ScheduleRow } from '../ui-better-soft/schedule-row';
import { DAY_LABELS, LUNCH_DAY_OF_WEEK, } from './types';
import { crossesMidnight, summarizeSchedule } from './schedule-summary';
/**
 * The schedule editor body rendered inside the side Sheet: name + one `ScheduleRow` per weekday
 * + the lunch row. Purely controlled — the Sheet owns the draft state and persistence.
 */
export function ScheduleForm({ name, onNameChange, hours, onHoursChange, errorMessage, }) {
    const weekDays = hours.filter((h) => h.day_of_week !== LUNCH_DAY_OF_WEEK);
    const lunch = hours.find((h) => h.day_of_week === LUNCH_DAY_OF_WEEK);
    const patchDay = (dayOfWeek, patch) => onHoursChange(hours.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h)));
    const anyCross = hours.some((h) => h.active && crossesMidnight(h.open_time, h.close_time));
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { htmlFor: "agenda-schedule-name", children: "Nome desta disponibilidade" }), _jsx(Input, { id: "agenda-schedule-name", value: name, onChange: (e) => onNameChange(e.target.value), placeholder: "Ex.: Atendimento comercial", maxLength: 80 }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Sugest\u00E3o autom\u00E1tica \u2014 ajuste como preferir." })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-semibold", children: [_jsx(CalendarDays, { className: "h-4 w-4 text-muted-foreground" }), "Dias e hor\u00E1rios"] }), _jsxs("div", { className: "space-y-2.5", children: [weekDays.map((day) => (_jsx(ScheduleRow, { label: DAY_LABELS[day.day_of_week], switchAriaLabel: `Atender ${DAY_LABELS[day.day_of_week]}`, enabled: day.active, onEnabledChange: (v) => patchDay(day.day_of_week, { active: v }), start: day.open_time, end: day.close_time, onStartChange: (v) => patchDay(day.day_of_week, { open_time: v }), onEndChange: (v) => patchDay(day.day_of_week, { close_time: v }) }, day.day_of_week))), lunch ? (_jsx(ScheduleRow, { label: DAY_LABELS[LUNCH_DAY_OF_WEEK], icon: Utensils, description: "Pausa aplicada em todos os dias ativos.", switchAriaLabel: "Pausa para almo\u00E7o", enabled: lunch.active, onEnabledChange: (v) => patchDay(LUNCH_DAY_OF_WEEK, { active: v }), start: lunch.open_time, end: lunch.close_time, onStartChange: (v) => patchDay(LUNCH_DAY_OF_WEEK, { open_time: v }), onEndChange: (v) => patchDay(LUNCH_DAY_OF_WEEK, { close_time: v }) })) : null] })] }), anyCross ? (_jsx("div", { className: "rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground", children: "Um ou mais per\u00EDodos terminam no dia seguinte (ex.: 22:00 \u2192 02:00)." })) : null, _jsxs("div", { className: "rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground", children: [_jsx("span", { className: "font-medium text-foreground", children: "Resumo: " }), summarizeSchedule(hours)] }), errorMessage ? _jsx(InlineAlert, { type: "error", text: errorMessage }) : null] }));
}
//# sourceMappingURL=schedule-form.js.map