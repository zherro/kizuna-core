'use client';

import { CalendarClock, MapPin, Save, Timer, UserCheck } from 'lucide-react';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ChoiceCard } from '../ui-better-soft/choice-card';
import { NumberField } from '../ui-better-soft/forms/number-field';
import { Section } from '../ui-better-soft/section';
import { ToggleRow } from '../ui-better-soft/toggle-row';
import { useTenantResource } from '../../hooks/use-tenant-resource';
import { DEFAULT_BOOKING_PREFERENCES, type BookingPreferences } from './types';

const BOOKING_WINDOW_OPTIONS = [
  { days: 7, title: '1 semana', description: 'Agenda curta, mais controle. Até 7 dias à frente.' },
  { days: 15, title: '15 dias', description: 'Meio-termo, bom para a maioria.' },
  { days: 30, title: '30 dias', description: 'Máximo — clientes planejam com antecedência.' },
];

export function AgendaRulesSection() {
  const prefs = useTenantResource<BookingPreferences & { id?: string }>({
    resource: 'agenda_booking_preferences',
    defaultItems: [DEFAULT_BOOKING_PREFERENCES],
    loadErrorMessage: 'Não foi possível carregar as regras da agenda.',
    saveSuccessMessage: 'Regras da agenda salvas.',
  });

  const value = prefs.items[0] ?? DEFAULT_BOOKING_PREFERENCES;
  const patch = <K extends keyof BookingPreferences>(key: K, next: BookingPreferences[K]) =>
    prefs.setItems([{ ...value, [key]: next }]);

  return (
    <Section
      icon={<Timer className="h-4 w-4" />}
      title="Regras gerais da agenda"
      description="Valem para todos os seus horários. Você pode mudar quando quiser."
    >
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            Até quantos dias à frente o cliente pode agendar?
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {BOOKING_WINDOW_OPTIONS.map((o) => (
              <ChoiceCard
                key={o.days}
                selected={value.booking_window_days === o.days}
                onSelect={() => patch('booking_window_days', o.days)}
                title={o.title}
                description={o.description}
                badge={value.booking_window_days === o.days ? 'Escolhido' : undefined}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            Quem escolhe o horário do atendimento?
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChoiceCard
              selected={value.client_picks_schedule}
              onSelect={() => patch('client_picks_schedule', true)}
              title="O cliente escolhe"
              description="O cliente vê os horários livres e já escolhe dia e hora ao pedir."
              badge="Mais rápido"
            />
            <ChoiceCard
              selected={!value.client_picks_schedule}
              onSelect={() => patch('client_picks_schedule', false)}
              title="Eu escolho ao fechar"
              description="O cliente descreve o que precisa e você combina o horário na confirmação."
              badge="Mais controle"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <NumberField
            label="Antecedência mínima"
            suffix="horas"
            hint="O cliente não agenda para daqui a menos de X horas."
            value={value.min_advance_hours}
            min={0}
            max={72}
            onChange={(v) => patch('min_advance_hours', v)}
          />
          <NumberField
            label="Intervalo entre atendimentos"
            suffix="minutos"
            hint="Folga entre um atendimento e o próximo."
            value={value.buffer_minutes}
            min={0}
            max={180}
            step={5}
            onChange={(v) => patch('buffer_minutes', v)}
          />
          <NumberField
            label="Raio de atendimento"
            suffix="km"
            hint="Distância máxima que você aceita se deslocar."
            icon={MapPin}
            value={value.service_radius_km}
            min={1}
            max={200}
            onChange={(v) => patch('service_radius_km', v)}
          />
          <ToggleRow
            title="Aceitar automaticamente clientes recorrentes"
            subtitle="Pedidos de quem você já atendeu entram direto na agenda."
            checked={value.auto_accept_trusted}
            onChange={(v) => patch('auto_accept_trusted', v)}
          />
        </div>

        <div className="flex justify-end">
          <BsButton
            label={prefs.saving ? 'Salvando…' : 'Salvar regras'}
            icon={Save}
            onClick={() => void prefs.save([value])}
            disabled={prefs.saving}
          />
        </div>
      </div>
    </Section>
  );
}
