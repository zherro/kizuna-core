import type { MapPlaceDetail, MapPlaceFacts } from './map-api';

/** "2026-11-05" ou "2026-11-05T20:30:00" → "05/11/2026" ou "05/11/2026 às 20h30". Texto fora do padrão volta como veio. */
export function formatEventStart(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(s);
  if (!m) return s;
  const date = `${m[3]}/${m[2]}/${m[1]}`;
  if (!m[4] || (m[4] === '00' && m[5] === '00')) return date;
  return `${date} às ${m[4]}h${m[5] === '00' ? '' : m[5]}`;
}

const digits = (v: string) => v.replace(/\D/g, '');

/** `tel:` só para número com 8 a 13 dígitos. */
export function telHref(raw: string | null | undefined): string | undefined {
  const d = digits(raw ?? '');
  return d.length >= 8 && d.length <= 13 ? `tel:${d}` : undefined;
}

/** WhatsApp: número brasileiro sem DDI ganha o 55. */
export function whatsappHref(raw: string | null | undefined): string | undefined {
  let d = digits(raw ?? '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 && d.length <= 13 ? `https://wa.me/${d}` : undefined;
}

export function instagramInfo(raw: string | null | undefined): { label: string; href?: string } | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const handle = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/+$/, '');
  return /^[A-Za-z0-9._]{1,30}$/.test(handle)
    ? { label: `@${handle}`, href: `https://instagram.com/${handle}` }
    : { label: s };
}

/** Só http/https vira link; o resto aparece como texto. */
export function siteInfo(raw: string | null | undefined): { label: string; href?: string } | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { label: s };
    return { label: u.hostname.replace(/^www\./, ''), href: u.toString() };
  } catch {
    return { label: s };
  }
}

export type DetailFact = {
  key: 'telefone' | 'whatsapp' | 'instagram' | 'site' | 'horario' | 'preco';
  label: string;
  value: string | string[];
  href?: string;
};

function priceFact(detail: MapPlaceDetail, facts: MapPlaceFacts): string | null {
  if (facts.preco && facts.preco.trim()) return facts.preco.trim();
  if (facts.gratuito) return 'Gratuito';
  const n = detail.price == null ? 0 : Number(detail.price);
  return Number.isFinite(n) && n > 0
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;
}

/** Fatos do detalhe já prontos para a ficha: só o que tem valor, com links seguros. */
export function detailFacts(detail: MapPlaceDetail): DetailFact[] {
  const f = detail.facts ?? {};
  const out: DetailFact[] = [];
  if (f.telefone?.trim()) out.push({ key: 'telefone', label: 'Telefone', value: f.telefone.trim(), href: telHref(f.telefone) });
  if (f.whatsapp?.trim()) out.push({ key: 'whatsapp', label: 'WhatsApp', value: f.whatsapp.trim(), href: whatsappHref(f.whatsapp) });
  const insta = instagramInfo(f.instagram);
  if (insta) out.push({ key: 'instagram', label: 'Instagram', value: insta.label, href: insta.href });
  const site = siteInfo(f.site);
  if (site) out.push({ key: 'site', label: 'Site', value: site.label, href: site.href });
  const hours = (Array.isArray(f.horario) ? f.horario : []).map((h) => (h?.texto ?? '').trim()).filter(Boolean);
  if (hours.length > 0) out.push({ key: 'horario', label: 'Horário', value: hours });
  const price = priceFact(detail, f);
  if (price) out.push({ key: 'preco', label: 'Preço', value: price });
  return out;
}
