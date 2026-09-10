'use client';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { ALL_DAYS, buildDefaultHour, mergeHoursByDay, } from './types';
const SCHEDULE_URL = '/api/resources/agenda_schedule';
const HOURS_URL = '/api/resources/agenda_schedule_hours';
async function readJson(res) {
    return (await res.json().catch(() => null));
}
/**
 * Loads the tenant's schedules and their weekday rows (two list calls, grouped client-side — no
 * N+1), and persists one schedule at a time as an atomic-ish unit: upsert the `agenda_schedule`
 * row, then upsert its 8 `agenda_schedule_hours` rows. Nothing hits the DB until `saveSchedule`.
 */
export function useAgendaSchedules() {
    const { error: toastError, success: toastSuccess } = useToast();
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [schedRes, hoursRes] = await Promise.all([
                fetch(`${SCHEDULE_URL}?page=1&pageSize=100`, { cache: 'no-store' }),
                fetch(`${HOURS_URL}?page=1&pageSize=500`, { cache: 'no-store' }),
            ]);
            if (!schedRes.ok || !hoursRes.ok) {
                toastError('Não foi possível carregar seus horários.');
                return;
            }
            const schedList = (await readJson(schedRes))?.items ?? [];
            const hoursList = (await readJson(hoursRes))?.items ?? [];
            const bySchedule = new Map();
            for (const h of hoursList) {
                if (!h.schedule_id)
                    continue;
                bySchedule.set(h.schedule_id, [...(bySchedule.get(h.schedule_id) ?? []), h]);
            }
            // soft-deleted rows are already filtered server-side (softDeleteField); a disabled
            // schedule (active=false) stays in the list, just greyed out.
            setSchedules(schedList.map((s) => ({ ...s, hours: mergeHoursByDay(bySchedule.get(s.id) ?? []) })));
        }
        catch {
            toastError('Não foi possível carregar seus horários.');
        }
        finally {
            setLoading(false);
        }
    }, [toastError]);
    useEffect(() => {
        void load();
    }, [load]);
    const saveSchedule = useCallback(async (draft) => {
        setSaving(true);
        try {
            const isUpdate = Boolean(draft.id);
            const schedRes = await fetch(isUpdate ? `${SCHEDULE_URL}/${draft.id}` : SCHEDULE_URL, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: draft.name.trim(), timezone: draft.timezone, active: true }),
            });
            const schedPayload = await readJson(schedRes);
            if (!schedRes.ok || !schedPayload?.item) {
                toastError(schedPayload?.message || 'Não foi possível salvar o horário.');
                return false;
            }
            const scheduleId = schedPayload.item.id;
            const normalized = mergeHoursByDay(draft.hours);
            const savedHours = [];
            for (const h of normalized) {
                const hourUpdate = Boolean(h.id);
                const res = await fetch(hourUpdate ? `${HOURS_URL}/${h.id}` : HOURS_URL, {
                    method: hourUpdate ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schedule_id: scheduleId,
                        day_of_week: h.day_of_week,
                        open_time: h.open_time,
                        close_time: h.close_time,
                        active: h.active,
                    }),
                });
                const payload = await readJson(res);
                if (!res.ok || !payload?.item) {
                    toastError(payload?.message || 'Não foi possível salvar um dos dias.');
                    return false;
                }
                savedHours.push(payload.item);
            }
            setSchedules((prev) => {
                const next = {
                    ...schedPayload.item,
                    hours: mergeHoursByDay(savedHours),
                };
                return isUpdate ? prev.map((s) => (s.id === scheduleId ? next : s)) : [...prev, next];
            });
            toastSuccess(isUpdate
                ? 'Horário atualizado.'
                : `Disponibilidade "${draft.name.trim()}" criada com sucesso.`);
            return true;
        }
        catch {
            toastError('Não foi possível salvar o horário.');
            return false;
        }
        finally {
            setSaving(false);
        }
    }, [toastError, toastSuccess]);
    /** Lightweight PATCH of just the `active` flag on the schedule row. */
    const setScheduleActive = useCallback(async (id, active) => {
        setSaving(true);
        try {
            const res = await fetch(`${SCHEDULE_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active }),
            });
            const payload = await readJson(res);
            if (!res.ok || !payload?.item) {
                toastError(payload?.message || 'Não foi possível atualizar o horário.');
                return false;
            }
            setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, active } : s)));
            return true;
        }
        catch {
            toastError('Não foi possível atualizar o horário.');
            return false;
        }
        finally {
            setSaving(false);
        }
    }, [toastError]);
    /** Soft delete via DELETE — the resource's softDeleteField turns it into PATCH deleted=true. */
    const removeSchedule = useCallback(async (id) => {
        setSaving(true);
        try {
            const res = await fetch(`${SCHEDULE_URL}/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const payload = await readJson(res);
                toastError(payload?.message || 'Não foi possível remover o horário.');
                return false;
            }
            setSchedules((prev) => prev.filter((s) => s.id !== id));
            toastSuccess('Horário removido.');
            return true;
        }
        catch {
            toastError('Não foi possível remover o horário.');
            return false;
        }
        finally {
            setSaving(false);
        }
    }, [toastError, toastSuccess]);
    const duplicateSchedule = useCallback(async (source) => {
        return saveSchedule({
            name: `${source.name} (cópia)`,
            timezone: source.timezone,
            hours: source.hours.map((h) => ({
                day_of_week: h.day_of_week,
                open_time: h.open_time,
                close_time: h.close_time,
                active: h.active,
            })),
        });
    }, [saveSchedule]);
    return {
        schedules,
        loading,
        saving,
        load,
        saveSchedule,
        setScheduleActive,
        removeSchedule,
        duplicateSchedule,
        emptyHours: ALL_DAYS.map(buildDefaultHour),
    };
}
//# sourceMappingURL=use-agenda-schedules.js.map