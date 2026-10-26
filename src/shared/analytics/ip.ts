const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseIpv4(s: string): number[] | null {
  const m = IPV4.exec(s);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((n) => n <= 255) ? parts : null;
}

/** Expande um IPv6 (com `::` opcional) em 8 grupos de 16 bits; inválido → null. */
function parseIpv6(s: string): number[] | null {
  if (!s.includes(':') || /[^0-9a-fA-F:.]/.test(s)) return null;
  let str = s;
  // cauda em IPv4 (ex.: ::ffff:1.2.3.4) vira dois grupos hex
  const last = str.slice(str.lastIndexOf(':') + 1);
  if (last.includes('.')) {
    const v4 = parseIpv4(last);
    if (!v4) return null;
    const hi = ((v4[0] << 8) | v4[1]).toString(16);
    const lo = ((v4[2] << 8) | v4[3]).toString(16);
    str = `${str.slice(0, str.lastIndexOf(':') + 1)}${hi}:${lo}`;
  }
  const halves = str.split('::');
  if (halves.length > 2) return null;
  const toGroups = (h: string) => (h === '' ? [] : h.split(':'));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  const all = [...head, ...tail];
  if (!all.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  let groups: string[];
  if (halves.length === 2) {
    const missing = 8 - all.length;
    if (missing < 1) return null;
    groups = [...head, ...Array(missing).fill('0'), ...tail];
  } else {
    if (all.length !== 8) return null;
    groups = all;
  }
  return groups.map((g) => parseInt(g, 16));
}

/** Se for IPv6 de IPv4 mapeado (::ffff:a.b.c.d), devolve o IPv4. */
function mappedIpv4(groups: number[]): string | null {
  const isMapped =
    groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff;
  if (!isMapped) return null;
  return [groups[6] >> 8, groups[6] & 255, groups[7] >> 8, groups[7] & 255].join('.');
}

/**
 * Normaliza o IP vindo de header: pega o primeiro salto de `a, b, c`,
 * converte IPv4 mapeado em IPv6 para IPv4 e valida. Inválido → null.
 */
export function normalizeIp(raw: string): string | null {
  const first = (raw || '').split(',')[0].trim();
  if (!first) return null;
  if (parseIpv4(first)) return first;
  const v6 = parseIpv6(first);
  if (!v6) return null;
  return mappedIpv4(v6) ?? first.toLowerCase();
}

/** Falso para loopback, privados (RFC1918), link-local, ULA (fc00::/7) e não especificado. */
export function isPublicIp(ip: string): boolean {
  const norm = normalizeIp(ip);
  if (!norm) return false;
  const v4 = parseIpv4(norm);
  if (v4) {
    const [a, b] = v4;
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    return true;
  }
  const g = parseIpv6(norm);
  if (!g) return false;
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  if ((g[0] & 0xfe00) === 0xfc00) return false; // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return false; // fe80::/10
  return true;
}

/**
 * Mascara o IP para exibição: IPv4 sem o último octeto (`187.12.45.•`),
 * IPv6 só com os 3 primeiros grupos (`2804:14d:5c80:•`). Nunca devolve o IP inteiro.
 */
export function maskIp(ip: string): string {
  const norm = normalizeIp(ip);
  if (!norm) return '•';
  const v4 = parseIpv4(norm);
  if (v4) return `${v4[0]}.${v4[1]}.${v4[2]}.•`;
  const g = parseIpv6(norm);
  if (!g) return '•';
  return `${g.slice(0, 3).map((x) => x.toString(16)).join(':')}:•`;
}
