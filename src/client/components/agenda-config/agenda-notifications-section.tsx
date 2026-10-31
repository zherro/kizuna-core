'use client';

import { Bell, Save } from 'lucide-react';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { NumberField } from '../ui-better-soft/forms/number-field';
import { Section } from '../ui-better-soft/section';
import { ToggleRow } from '../ui-better-soft/toggle-row';
import { useTenantResource } from '../../hooks/use-tenant-resource';
import { DEFAULT_NOTIFICATION_PREFERENCES, type AgendaNotificationPreferences } from './types';

export function AgendaNotificationsSection() {
  const prefs = useTenantResource<AgendaNotificationPreferences & { id?: string }>({
    resource: 'agenda_notification_preferences',
    defaultItems: [DEFAULT_NOTIFICATION_PREFERENCES],
    loadErrorMessage: 'Não foi possível carregar as notificações da agenda.',
    saveSuccessMessage: 'Notificações da agenda salvas.',
  });

  const value = prefs.items[0] ?? DEFAULT_NOTIFICATION_PREFERENCES;
  const patch = <K extends keyof AgendaNotificationPreferences>(
    key: K,
    next: AgendaNotificationPreferences[K]
  ) => prefs.setItems([{ ...value, [key]: next }]);

  return (
    <Section
      icon={<Bell className="h-4 w-4" />}
      title="Notificações da agenda"
      description="Quando e como você quer ser avisado sobre a sua agenda."
    >
      <div className="space-y-4">
        <div className="space-y-2.5">
          <ToggleRow
            title="Novo agendamento"
            subtitle="Avisar quando um cliente marcar um horário."
            checked={value.notify_new_booking}
            onChange={(v) => patch('notify_new_booking', v)}
          />
          <ToggleRow
            title="Cancelamento"
            subtitle="Avisar quando um agendamento for cancelado."
            checked={value.notify_cancellation}
            onChange={(v) => patch('notify_cancellation', v)}
          />
          <ToggleRow
            title="Lembrete de atendimento"
            subtitle="Lembrar você antes de cada atendimento."
            checked={value.notify_reminder}
            onChange={(v) => patch('notify_reminder', v)}
          />
        </div>

        {value.notify_reminder ? (
          <NumberField
            label="Enviar lembrete com antecedência de"
            suffix="horas"
            value={value.reminder_hours_before}
            min={1}
            max={72}
            onChange={(v) => patch('reminder_hours_before', v)}
          />
        ) : null}

        <div>
          <div className="mb-2 text-sm font-semibold">Canais</div>
          <div className="space-y-2.5">
            <ToggleRow
              title="E-mail"
              checked={value.channel_email}
              onChange={(v) => patch('channel_email', v)}
            />
            <ToggleRow
              title="Notificação no app"
              checked={value.channel_push}
              onChange={(v) => patch('channel_push', v)}
            />
            <ToggleRow
              title="WhatsApp"
              checked={value.channel_whatsapp}
              onChange={(v) => patch('channel_whatsapp', v)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <BsButton
            label={prefs.saving ? 'Salvando…' : 'Salvar notificações'}
            icon={Save}
            onClick={() => void prefs.save([value])}
            disabled={prefs.saving}
          />
        </div>
      </div>
    </Section>
  );
}
