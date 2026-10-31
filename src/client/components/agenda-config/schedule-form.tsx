'use client';

import { CalendarDays, Utensils } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { InlineAlert } from '../ui-better-soft/inline-alert';
import { ScheduleRow } from '../ui-better-soft/schedule-row';
import { DAY_LABELS, LUNCH_DAY_OF_WEEK, type ScheduleHourRecord } from './types';
import { crossesMidnight, summarizeSchedule } from './schedule-summary';

type ScheduleFormProps = {
  name: string;
  onNameChange: (value: string) => void;
  hours: ScheduleHourRecord[];
  onHoursChange: (next: ScheduleHourRecord[]) => void;
  errorMessage?: string | null;
};

/**
 * The schedule editor body rendered inside the side Sheet: name + one `ScheduleRow` per weekday
 * + the lunch row. Purely controlled — the Sheet owns the draft state and persistence.
 */
export function ScheduleForm({
  name,
  onNameChange,
  hours,
  onHoursChange,
  errorMessage,
}: Readonly<ScheduleFormProps>) {
  const weekDays = hours.filter((h) => h.day_of_week !== LUNCH_DAY_OF_WEEK);
  const lunch = hours.find((h) => h.day_of_week === LUNCH_DAY_OF_WEEK);

  const patchDay = (dayOfWeek: number, patch: Partial<ScheduleHourRecord>) =>
    onHoursChange(hours.map((h) => (h.day_of_week === dayOfWeek ? { ...h, ...patch } : h)));

  const anyCross = hours.some((h) => h.active && crossesMidnight(h.open_time, h.close_time));

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="agenda-schedule-name">Nome desta disponibilidade</Label>
        <Input
          id="agenda-schedule-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex.: Atendimento comercial"
          maxLength={80}
        />
        <p className="text-xs text-muted-foreground">Sugestão automática — ajuste como preferir.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Dias e horários
        </div>
        <div className="space-y-2.5">
          {weekDays.map((day) => (
            <ScheduleRow
              key={day.day_of_week}
              label={DAY_LABELS[day.day_of_week]}
              switchAriaLabel={`Atender ${DAY_LABELS[day.day_of_week]}`}
              enabled={day.active}
              onEnabledChange={(v) => patchDay(day.day_of_week, { active: v })}
              start={day.open_time}
              end={day.close_time}
              onStartChange={(v) => patchDay(day.day_of_week, { open_time: v })}
              onEndChange={(v) => patchDay(day.day_of_week, { close_time: v })}
            />
          ))}
          {lunch ? (
            <ScheduleRow
              label={DAY_LABELS[LUNCH_DAY_OF_WEEK]}
              icon={Utensils}
              description="Pausa aplicada em todos os dias ativos."
              switchAriaLabel="Pausa para almoço"
              enabled={lunch.active}
              onEnabledChange={(v) => patchDay(LUNCH_DAY_OF_WEEK, { active: v })}
              start={lunch.open_time}
              end={lunch.close_time}
              onStartChange={(v) => patchDay(LUNCH_DAY_OF_WEEK, { open_time: v })}
              onEndChange={(v) => patchDay(LUNCH_DAY_OF_WEEK, { close_time: v })}
            />
          ) : null}
        </div>
      </div>

      {anyCross ? (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Um ou mais períodos terminam no dia seguinte (ex.: 22:00 → 02:00).
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Resumo: </span>
        {summarizeSchedule(hours)}
      </div>

      {errorMessage ? <InlineAlert type="error" text={errorMessage} /> : null}
    </div>
  );
}
