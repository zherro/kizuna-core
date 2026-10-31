'use client';

import { useMemo, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '../ui/button';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
import {
  ALL_DAYS,
  buildDefaultHour,
  mergeHoursByDay,
  type ScheduleHourRecord,
  type ScheduleWithHours,
} from './types';
import { ScheduleForm } from './schedule-form';
import { suggestScheduleName, validateSchedule } from './schedule-summary';

type ScheduleDraft = {
  id?: string;
  name: string;
  timezone: string;
  hours: ScheduleHourRecord[];
};

type ScheduleSheetProps = {
  open: boolean;
  /** null = creating a new schedule; a record = editing it. */
  editing: ScheduleWithHours | null;
  saving: boolean;
  timezone: string;
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft) => Promise<boolean>;
};

function cloneHours(source: ScheduleWithHours | null): ScheduleHourRecord[] {
  if (!source) return ALL_DAYS.map(buildDefaultHour);
  return mergeHoursByDay(source.hours.map((h) => ({ ...h })));
}

/**
 * Inner body — remounted fresh each time the sheet opens (keyed by the caller), so its draft
 * state is seeded once from props via `useState` initializers, no effects.
 */
function ScheduleSheetBody({
  editing,
  saving,
  timezone,
  onClose,
  onSubmit,
}: Readonly<Omit<ScheduleSheetProps, 'open'>>) {
  const initial = useMemo(
    () => ({ name: editing?.name ?? '', hours: cloneHours(editing) }),
    [editing]
  );

  const [name, setName] = useState(initial.name);
  const [hours, setHours] = useState<ScheduleHourRecord[]>(initial.hours);
  const [nameTouched, setNameTouched] = useState(Boolean(editing));
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const effectiveName = nameTouched ? name : suggestScheduleName(hours);

  const dirty = JSON.stringify({ name: effectiveName, hours }) !== JSON.stringify(initial);

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
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
    if (ok) onClose();
  };

  return (
    <>
      <ModalPanel
        open
        onClose={requestClose}
        dismissible={false}
        wide
        icon={<CalendarClock className="h-4 w-4" />}
        title={editing ? 'Editar horário' : 'Novo horário'}
        description="Configure os dias e as faixas de atendimento desta disponibilidade."
        headerFixed
        footerFixed
        footer={
          <>
            <Button type="button" variant="outline" onClick={requestClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Aplicar disponibilidade'}
            </Button>
          </>
        }
      >
        <ScheduleForm
          name={effectiveName}
          onNameChange={(v) => {
            setNameTouched(true);
            setName(v);
          }}
          hours={hours}
          onHoursChange={setHours}
          errorMessage={error}
        />
      </ModalPanel>

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar alterações?"
        description="As mudanças neste horário ainda não foram salvas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}

export function ScheduleSheet({ open, ...rest }: Readonly<ScheduleSheetProps>) {
  if (!open) return null;
  return <ScheduleSheetBody key={rest.editing?.id ?? 'new'} {...rest} />;
}
