/**
 * Regras de imagem que valem no cliente e no servidor (sem `sharp` — pode ir pro bundle do browser).
 * O servidor (`server/image`) usa as mesmas para decidir miniatura e aviso de baixa resolução.
 */

/** Maior lado da miniatura (`/content?size=thumb`). */
export const THUMB_MAX_SIDE = 640;

export type ImagePreset = 'avatar' | 'listing' | 'default' | 'thumb';

export type ImagePresetConfig = { width: number; height: number; fit: 'cover' | 'inside'; quality: number };

export const IMAGE_PRESETS: Record<ImagePreset, ImagePresetConfig> = {
  avatar: { width: 512, height: 512, fit: 'cover', quality: 80 },
  listing: { width: 1600, height: 1600, fit: 'inside', quality: 80 },
  default: { width: 2048, height: 2048, fit: 'inside', quality: 82 },
  // Miniatura (cards, busca, carrosséis, galeria): 640 no maior lado cobre um card de 260px em
  // tela 2x — foto horizontal (~520 de largura) e pôster em pé (~410 de altura) — sem cortar.
  thumb: { width: THUMB_MAX_SIDE, height: THUMB_MAX_SIDE, fit: 'inside', quality: 75 },
};

/** `purpose` do upload → preset (avatar → avatar; foto de anúncio → listing; resto → default). */
export function presetForPurpose(purpose?: string | null): ImagePreset {
  if (purpose === 'avatar') return 'avatar';
  if (purpose === 'ad_image' || purpose === 'service_image' || purpose === 'listing') return 'listing';
  return 'default';
}

/** Abaixo disso (no lado menor) a foto tende a ficar borrada no detalhe — o upload avisa. */
export const LOW_RESOLUTION_MIN_SIDE = 600;

/** Lado menor abaixo de `LOW_RESOLUTION_MIN_SIDE` (dimensões desconhecidas → `false`). */
export function isLowResolution(width: number | null | undefined, height: number | null | undefined): boolean {
  if (width == null || height == null) return false;
  return Math.min(width, height) < LOW_RESOLUTION_MIN_SIDE;
}

/** Só vale miniatura se a imagem passar do tamanho dela em algum lado. */
export function needsThumbnail(width: number | null | undefined, height: number | null | undefined): boolean {
  return width != null && height != null && (width > THUMB_MAX_SIDE || height > THUMB_MAX_SIDE);
}
