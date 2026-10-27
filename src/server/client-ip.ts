/**
 * IP do cliente para limite/lockout de tentativas (login, OTP, captcha).
 *
 * Usa o salto de `x-forwarded-for` contado da DIREITA por `TRUSTED_PROXY_HOPS` (inteiro >= 1,
 * padrão 1): os saltos à esquerda o cliente pode forjar, então o primeiro valor nunca é confiável
 * quando há mais de uma entrada. Uma entrada só (Vercel/Cloudflare sobrescrevem) vale essa entrada.
 * Sem `x-forwarded-for` → `x-real-ip`. `''` quando não há IP (dev sem proxy).
 */

function stripPort(hop: string): string {
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(hop);
  if (v4) return v4[1]!;
  const v6 = /^\[([^\]]+)\](?::\d+)?$/.exec(hop);
  return v6 ? v6[1]! : hop;
}

function trustedProxyHops(): number {
  const raw = process.env.TRUSTED_PROXY_HOPS?.trim() ?? '';
  if (!/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  return n >= 1 ? n : 1;
}

export function trustedClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const hops = forwarded.split(',').map((h) => h.trim());
    const index = hops.length === 1 ? 0 : hops.length - trustedProxyHops();
    const hop = index >= 0 ? hops[index] : '';
    return hop ? stripPort(hop) : '';
  }
  const real = request.headers.get('x-real-ip')?.trim() ?? '';
  return real ? stripPort(real) : '';
}
