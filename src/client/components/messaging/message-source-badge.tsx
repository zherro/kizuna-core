'use client';
import type { MessageChannel } from '../../../types';

const LABEL: Partial<Record<MessageChannel, string>> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  telegram: 'Telegram',
  email: 'E-mail',
};

/** Discreet origin tag — renders nothing for platform/system so a normal chat stays clean. */
export function MessageSourceBadge({ source }: { source: MessageChannel }) {
  const label = LABEL[source];
  if (!label) return null;
  return (
    <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  );
}
