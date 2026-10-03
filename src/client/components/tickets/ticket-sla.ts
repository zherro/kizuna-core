/**
 * Prazo (SLA) da PRIMEIRA RESPOSTA do chamado, em dias úteis (sáb/dom não contam; feriados não).
 * Denúncia de anúncio/conteúdo tem prazo menor. Calculado na criação (servidor) e gravado em
 * `tickets.sla_due_at`; a data não muda depois.
 */
export const SLA_BUSINESS_DAYS = 3;
export const SLA_URGENT_BUSINESS_DAYS = 1;
export const URGENT_SUBJECT = 'Denunciar anúncio ou conteúdo';

export function addBusinessDays(from: Date, days: number): Date {
  const date = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return date;
}

export function slaBusinessDays(title: string): number {
  return title.trim() === URGENT_SUBJECT ? SLA_URGENT_BUSINESS_DAYS : SLA_BUSINESS_DAYS;
}

/** ISO do prazo de primeira resposta para um chamado com este assunto, aberto agora. */
export function slaDueAt(title: string, now: Date = new Date()): string {
  return addBusinessDays(now, slaBusinessDays(title)).toISOString();
}

export const formatSlaDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
