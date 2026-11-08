import { AD_FORMAT_SPECS, AD_SLOT_CATALOG, checkCreativeRatio, isSafeLinkUrl, type AdFormat, type AdKind, type AdSlotDef } from '../../../../shared/ads';

export const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function creativeKind(mime: string): AdKind {
  return mime === 'image/gif' ? 'gif' : 'imagem';
}

export type Check = { ok: true } | { ok: false; reason: string };

export function validateBannerFile(f: { type: string; size: number }): Check {
  if (!ACCEPTED.includes(f.type)) return { ok: false, reason: 'Envie PNG, JPG, WebP ou GIF.' };
  if (f.size > MAX_BANNER_BYTES) return { ok: false, reason: 'O arquivo passa de 5 MB. Reduza e envie de novo.' };
  return { ok: true };
}

export function validateBannerLink(url: string): Check {
  const u = url.trim();
  if (!isSafeLinkUrl(u) || !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(u)) {
    return { ok: false, reason: 'O link deve começar com http:// ou https://.' };
  }
  return { ok: true };
}

/** Slots que o anunciante pode contratar: montados no site, ligados no banco e que aceitam imagem ou GIF. */
export function contractableSlots(rows: Array<{ slug: string; enabled: boolean; media: string[] }>): AdSlotDef[] {
  const on = new Map(rows.map((r) => [r.slug, r]));
  return AD_SLOT_CATALOG.filter((s) => {
    if (s.mounted === false) return false;
    const row = on.get(s.slug);
    return !!row && row.enabled && (row.media.includes('imagem') || row.media.includes('gif'));
  });
}

export function recommendedSize(format: AdFormat): string {
  const s = AD_FORMAT_SPECS[format];
  return `${s.width}×${s.height}px`;
}

export function checkBannerImage(format: AdFormat, size: { width: number; height: number }): Check {
  return checkCreativeRatio(format, size);
}

/** Lê largura e altura reais no navegador. */
export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível abrir a imagem.'));
    };
    img.src = url;
  });
}

/** Mesmo envio do painel root (storage plugin). GIF animado não passa pelo otimizador. */
export async function uploadBanner(file: File): Promise<string> {
  const form = new FormData();
  form.append('files', file);
  form.append('purpose', 'banner');
  form.append('optimizeImages', creativeKind(file.type) === 'gif' ? 'false' : 'true');
  const res = await fetch('/api/storage/files', { method: 'POST', body: form });
  const body = (await res.json().catch(() => null)) as {
    message?: string;
    uploaded?: Array<{ id: string }>;
    errors?: Array<{ message: string }>;
  } | null;
  const id = body?.uploaded?.[0]?.id;
  if (!res.ok || !id) throw new Error(body?.errors?.[0]?.message ?? body?.message ?? 'Falha ao enviar o arquivo.');
  return `/api/public/storage/files/${id}/content`;
}
