import { decryptValue } from '../app-crypto';

/**
 * Decifra o IP gravado em `analytics_events.ip` (token de `encryptValue('analytics-ip', ip)`).
 * Precisa da mesma `APP_ENCRYPTION_KEY` que cifrou. Token inválido, adulterado, de outro
 * propósito ou chave diferente → `null`. Nunca loga o token nem o IP.
 */
export function revealAnalyticsIp(token: string): string | null {
  try {
    return decryptValue('analytics-ip', token);
  } catch {
    return null;
  }
}
