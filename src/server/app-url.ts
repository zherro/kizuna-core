/**
 * URL pública do app. Use `APP_URL` em produção — o fallback pelo host da requisição
 * existe só para dev e confia no header `Host`.
 */
export function resolveAppUrl(request: Request): string {
  const fromEnv = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  return `${proto}://${host}`;
}

/**
 * Só aceita caminho relativo do próprio site (`/algo`). Recusa `//host`, `/\host`, URL absoluta
 * e qualquer coisa com esquema — evita open redirect no retorno do login.
 */
export function sanitizeReturnTo(value: string | null | undefined, fallback = '/'): string {
  if (!value || typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\r\n]/.test(value)) return fallback;
  return value;
}
