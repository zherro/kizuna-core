'use client';

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
import type { ScheduleWithHours } from './types';

const DEFAULT_TZ = 'America/Sao_Paulo';

/**
 * `/painel/agenda/horarios` — the tenant's agenda configuration. A list of named weekly
 * schedules (each edited in a side Sheet) plus the two per-tenant singletons: general booking
 * rules and agenda notification preferences. Ships from the `agenda` plugin; a consuming
 * project just re-exports it from its route file.
 */
export function AgendaConfigPage() {
  const {
    schedules,
    loading,
    saving,
    saveSchedule,
    setScheduleActive,
    removeSchedule,
    duplicateSchedule,
  } = useAgendaSchedules();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleWithHours | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ScheduleWithHours | null>(null);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (schedule: ScheduleWithHours) => {
    setEditing(schedule);
    setSheetOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <AdminPageReader
        title="Horários de atendimento"
        description="Crie um ou mais horários de atendimento e defina as regras da sua agenda."
        backHref="/painel/agenda"
        actions={
          schedules.length > 0 ? (
            <BsButton label="Novo horário" icon={Plus} onClick={openCreate} />
          ) : undefined
        }
      />

      <div className="space-y-6">
        <section>
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : schedules.length === 0 ? (
            <SchedulesEmptyState onCreate={openCreate} />
          ) : (
            <ul className="space-y-3">
              {schedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  busy={saving}
                  onEdit={() => openEdit(schedule)}
                  onDuplicate={() => void duplicateSchedule(schedule)}
                  onToggleActive={(active) => void setScheduleActive(schedule.id, active)}
                  onDelete={() => setPendingDelete(schedule)}
                />
              ))}
            </ul>
          )}
        </section>

        <AgendaRulesSection />
        <AgendaNotificationsSection />
      </div>

      <ScheduleSheet
        open={sheetOpen}
        editing={editing}
        saving={saving}
        timezone={DEFAULT_TZ}
        onClose={() => setSheetOpen(false)}
        onSubmit={saveSchedule}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir este horário?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" deixará de ficar disponível para novos agendamentos.`
            : undefined
        }
        confirmLabel="Excluir"
        loading={saving}
        onConfirm={() => {
          if (pendingDelete) void removeSchedule(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
