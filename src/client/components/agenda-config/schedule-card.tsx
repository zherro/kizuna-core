'use client';

import { Clock, Copy, MoreVertical, Pencil, Power, Trash2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';
import type { ScheduleWithHours } from './types';
import { summarizeSchedule } from './schedule-summary';

type ScheduleCardProps = {
  schedule: ScheduleWithHours;
  busy?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
};

export function ScheduleCard({
  schedule,
  busy,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
}: Readonly<ScheduleCardProps>) {
  return (
    <EntityListCard
      tone={schedule.active ? 'info' : 'muted'}
      leading={
        <button type="button" onClick={onEdit} className="block text-left">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{schedule.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{summarizeSchedule(schedule.hours)}</span>
          </div>
        </button>
      }
      trailing={
        <div className="flex items-center gap-1.5">
          <Switch
            checked={schedule.active}
            onCheckedChange={onToggleActive}
            disabled={busy}
            aria-label={schedule.active ? 'Desativar horário' : 'Ativar horário'}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Ações do horário"
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onToggleActive(!schedule.active)}>
                <Power className="mr-2 h-4 w-4" />
                {schedule.active ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  );
}
