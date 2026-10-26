export const ANALYTICS_DEVICES = ['mobile', 'tablet', 'desktop'] as const;
export type AnalyticsDevice = (typeof ANALYTICS_DEVICES)[number];

/**
 * Classifica o aparelho pelo user-agent; quando o UA não decide
 * (vazio/desconhecido), cai para a largura da janela.
 */
export function classifyDevice(ua: string, width: number): AnalyticsDevice {
  const s = ua || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(s)) return 'tablet';
  if (/Android/i.test(s)) return /Mobile/i.test(s) ? 'mobile' : 'tablet';
  if (/iPhone|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini/i.test(s)) return 'mobile';
  if (/Windows NT|Macintosh|X11|CrOS/i.test(s)) return 'desktop';
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
