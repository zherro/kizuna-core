'use client';

import { useState } from 'react';
import { CalendarClock, Plus, SlidersHorizontal, Bell } from 'lucide-react';
import { AdminPageReader } from '../ui-better-soft/headers/admin-page-reader';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
  const [activeTab, setActiveTab] = useState('horarios');

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
        title="Configuração da agenda"
        description="Horários de atendimento, regras de reserva e notificações — tudo em um só lugar."
        backHref="/painel/agenda"
        actions={
          activeTab === 'horarios' && schedules.length > 0 ? (
            <BsButton label="Novo horário" icon={Plus} onClick={openCreate} />
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
          <TabsTrigger
            value="horarios"
            className="flex flex-col items-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-1.5 sm:text-sm"
          >
            <CalendarClock className="h-4 w-4 shrink-0" />
            Horários
          </TabsTrigger>
          <TabsTrigger
            value="regras"
            className="flex flex-col items-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-1.5 sm:text-sm"
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            Regras
          </TabsTrigger>
          <TabsTrigger
            value="notificacoes"
            className="flex flex-col items-center gap-1 whitespace-normal px-1.5 py-2 text-center text-[11px] leading-tight sm:flex-row sm:gap-1.5 sm:text-sm"
          >
            <Bell className="h-4 w-4 shrink-0" />
            Avisos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="horarios" className="space-y-3">
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
        </TabsContent>

        <TabsContent value="regras">
          <AgendaRulesSection />
        </TabsContent>

        <TabsContent value="notificacoes">
          <AgendaNotificationsSection />
        </TabsContent>
      </Tabs>

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
