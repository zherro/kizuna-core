/**
 * Canal do clique de contato (`analytics_events.channel`, analytics 0005). Só vale para
 * `contact_click`; o servidor ignora em outros eventos.
 */
export const ANALYTICS_CHANNELS = ['whatsapp', 'phone', 'purchase', 'site', 'email', 'instagram', 'other'] as const;
export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

export function isAnalyticsChannel(v: unknown): v is AnalyticsChannel {
  return typeof v === 'string' && (ANALYTICS_CHANNELS as readonly string[]).includes(v);
}

const WHATSAPP = /^(whatsapp:|https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|web\.whatsapp\.com|(www\.)?whatsapp\.com)(\/|$|\?))/i;
const INSTAGRAM = /^https?:\/\/(www\.|m\.)?(instagram\.com|instagr\.am)(\/|$|\?)/i;

/**
 * Deduz o canal pelo href do botão: tel: → phone, mailto: → email, wa.me/whatsapp → whatsapp,
 * instagram.com → instagram, outro http(s) → site. Link de ingresso não dá para deduzir: quem
 * renderiza passa `channel="purchase"`.
 */
export function contactChannelFromHref(href: string | null | undefined): AnalyticsChannel {
  const h = (href ?? '').trim();
  if (/^tel:/i.test(h)) return 'phone';
  if (/^mailto:/i.test(h)) return 'email';
  if (WHATSAPP.test(h)) return 'whatsapp';
  if (INSTAGRAM.test(h)) return 'instagram';
  if (/^https?:\/\//i.test(h)) return 'site';
  return 'other';
}
