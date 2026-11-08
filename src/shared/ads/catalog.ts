import type { AdFormat } from './types';

export type AdSlotDef = { slug: string; label: string; format: AdFormat; mounted?: boolean };

export const AD_SLOT_CATALOG: AdSlotDef[] = [
  { slug: 'home-destaque', label: 'Home — abaixo do hero', format: 'faixa' },
  { slug: 'home-meio', label: 'Home — entre trilhos', format: 'banner' },
  { slug: 'trilho-card', label: 'Trilho — card Destaque', format: 'card' },
  { slug: 'busca-patrocinado', label: 'Busca — resultado patrocinado', format: 'card' },
  { slug: 'descobrir-card', label: 'Descobrir — card patrocinado', format: 'card-vertical', mounted: false },
  { slug: 'cidade-topo', label: 'Cidade — topo', format: 'banner' },
  { slug: 'anuncio-rodape', label: 'Anúncio — rodapé', format: 'retangulo' },
];

/**
 * `width`/`height`: tamanho recomendado em pixels do arquivo enviado. O criativo é exibido com
 * `object-cover`, então só a PROPORÇÃO importa: o painel do anunciante recusa imagens muito
 * fora dela (ver `checkCreativeRatio`).
 */
export const AD_FORMAT_SPECS: Record<AdFormat, { label: string; minHeight: number; width: number; height: number }> = {
  faixa: { label: 'Faixa (larga e baixa)', minHeight: 90, width: 1600, height: 120 },
  banner: { label: 'Banner largo', minHeight: 140, width: 1200, height: 240 },
  card: { label: 'Card de lista', minHeight: 280, width: 600, height: 400 },
  'card-vertical': { label: 'Card vertical (Descobrir)', minHeight: 420, width: 600, height: 900 },
  retangulo: { label: 'Retângulo', minHeight: 250, width: 1000, height: 420 },
};

/** Tolerância da proporção (largura ÷ altura) em relação à recomendada. */
export const AD_RATIO_TOLERANCE = 0.2;

/** A imagem enviada tem a proporção do formato (±20%)? Dimensões reais lidas no navegador. */
export function checkCreativeRatio(
  format: AdFormat,
  size: { width: number; height: number },
): { ok: true } | { ok: false; reason: string } {
  const spec = AD_FORMAT_SPECS[format];
  if (!size.width || !size.height) return { ok: false, reason: 'Não foi possível ler as dimensões da imagem.' };
  const want = spec.width / spec.height;
  const got = size.width / size.height;
  if (Math.abs(got - want) / want <= AD_RATIO_TOLERANCE) return { ok: true };
  return {
    ok: false,
    reason: `Proporção fora do formato: esta imagem tem ${size.width}×${size.height}px e o formato pede ${spec.width}×${spec.height}px (ou proporcional).`,
  };
}
