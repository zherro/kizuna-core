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

export const AD_FORMAT_SPECS: Record<AdFormat, { label: string; minHeight: number }> = {
  faixa: { label: 'Faixa (larga e baixa)', minHeight: 90 },
  banner: { label: 'Banner largo', minHeight: 140 },
  card: { label: 'Card de lista', minHeight: 280 },
  'card-vertical': { label: 'Card vertical (Descobrir)', minHeight: 420 },
  retangulo: { label: 'Retângulo', minHeight: 250 },
};
