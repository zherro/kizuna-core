/**
 * Pure helpers for turning a schedule's weekday rows into human strings — a compact card
 * summary, a suggested name, and client-side validation. No React, no I/O: unit-testable on
 * their own (foco-total's vitest covers these, same as the `reviews` resource configs).
 */
import { DAY_SHORT, LUNCH_DAY_OF_WEEK, WEEK_DAYS, } from './types';
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export function hmToMinutes(value) {
    const m = HM.exec(value.trim());
    if (!m)
        return NaN;
    return Number(m[1]) * 60 + Number(m[2]);
}
/** true when end is strictly before start — the period wraps past midnight (e.g. 22:00→02:00). */
export function crossesMidnight(open, close) {
    const o = hmToMinutes(open);
    const c = hmToMinutes(close);
    return Number.isFinite(o) && Number.isFinite(c) && c < o;
}
export function validateSchedule(name, hours) {
    if (!name.trim())
        return { ok: false, message: 'Dê um nome para esta disponibilidade.' };
    const activeDays = hours.filter((h) => h.day_of_week !== LUNCH_DAY_OF_WEEK && h.active);
    if (activeDays.length === 0) {
        return { ok: false, message: 'Ative pelo menos um dia de atendimento.' };
    }
    for (const h of hours) {
        if (!h.active)
            continue;
        if (!HM.test(h.open_time) || !HM.test(h.close_time)) {
            return { ok: false, message: 'Há um horário em formato inválido.' };
        }
        if (hmToMinutes(h.open_time) === hmToMinutes(h.close_time)) {
            return { ok: false, message: 'Início e fim de um período não podem ser iguais.' };
        }
    }
    const lunch = hours.find((h) => h.day_of_week === LUNCH_DAY_OF_WEEK);
    if (lunch?.active) {
        // lunch must sit inside at least the widest active working window and never wrap midnight
        if (crossesMidnight(lunch.open_time, lunch.close_time)) {
            return { ok: false, message: 'O horário de almoço não pode atravessar a meia-noite.' };
        }
        const ls = hmToMinutes(lunch.open_time);
        const le = hmToMinutes(lunch.close_time);
        const fitsSomewhere = activeDays.some((d) => {
            const ds = hmToMinutes(d.open_time);
            const de = hmToMinutes(d.close_time);
            const dayEnd = crossesMidnight(d.open_time, d.close_time) ? de + 1440 : de;
            return ls >= ds && le <= dayEnd;
        });
        if (!fitsSomewhere) {
            return { ok: false, message: 'O horário de almoço está fora do expediente.' };
        }
    }
    return { ok: true };
}
function groupConsecutive(days) {
    const sorted = [...days].sort((a, b) => a - b);
    const groups = [];
    for (const d of sorted) {
        const last = groups[groups.length - 1];
        if (last && d === last[last.length - 1] + 1)
            last.push(d);
        else
            groups.push([d]);
    }
    return groups;
}
/** e.g. "Seg–Sex · 08:00–18:00 · almoço 12:00–13:00" or "Sem dias ativos". */
export function summarizeSchedule(hours) {
    const active = hours.filter((h) => h.day_of_week !== LUNCH_DAY_OF_WEEK && h.active);
    if (active.length === 0)
        return 'Sem dias ativos';
    // group by identical open/close so "Seg–Sex 08–18, Sáb 08–12" reads right
    const byWindow = new Map();
    for (const h of active) {
        const key = `${h.open_time}-${h.close_time}`;
        byWindow.set(key, [...(byWindow.get(key) ?? []), h.day_of_week]);
    }
    const parts = [];
    for (const [window, days] of byWindow) {
        const [open, close] = window.split('-');
        const label = groupConsecutive(days)
            .map((g) => g.length === 1 ? DAY_SHORT[g[0]] : `${DAY_SHORT[g[0]]}–${DAY_SHORT[g[g.length - 1]]}`)
            .join(', ');
        const cross = crossesMidnight(open, close) ? ' (dia seguinte)' : '';
        parts.push(`${label} · ${open}–${close}${cross}`);
    }
    const lunch = hours.find((h) => h.day_of_week === LUNCH_DAY_OF_WEEK);
    if (lunch?.active)
        parts.push(`almoço ${lunch.open_time}–${lunch.close_time}`);
    return parts.join(' · ');
}
/** Suggested name from the shape of the week — always editable by the user. */
export function suggestScheduleName(hours) {
    const active = hours.filter((h) => h.day_of_week !== LUNCH_DAY_OF_WEEK && h.active);
    if (active.length === 0)
        return 'Nova disponibilidade';
    const days = active.map((h) => h.day_of_week).sort((a, b) => a - b);
    const isMonFri = days.length === 5 && days[0] === 1 && days[4] === 5;
    const isEveryDay = days.length === 7;
    const weekendOnly = days.every((d) => d === 0 || d === 6);
    const earliest = Math.min(...active.map((h) => hmToMinutes(h.open_time)));
    const latest = Math.max(...active.map((h) => crossesMidnight(h.open_time, h.close_time)
        ? hmToMinutes(h.close_time) + 1440
        : hmToMinutes(h.close_time)));
    const span = latest - earliest;
    if (span >= 1439)
        return 'Atendimento 24h';
    if (isEveryDay)
        return 'Todos os dias';
    if (weekendOnly)
        return 'Fim de semana';
    const nightly = earliest >= 18 * 60 || latest > 24 * 60;
    if (isMonFri && nightly)
        return 'Atendimento noturno';
    if (isMonFri)
        return 'Horário comercial';
    if (nightly)
        return 'Atendimento noturno';
    return 'Atendimento diurno';
}
export const _internal = { groupConsecutive, WEEK_DAYS };
//# sourceMappingURL=schedule-summary.js.map