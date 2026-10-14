export const AD_FORMATS = ['faixa', 'banner', 'card', 'card-vertical', 'retangulo'] as const;
export type AdFormat = (typeof AD_FORMATS)[number];
export const AD_KINDS = ['imagem', 'gif'] as const;
export type AdKind = (typeof AD_KINDS)[number];
export const AD_MEDIA = ['imagem', 'gif', 'google'] as const;
export type AdMedia = (typeof AD_MEDIA)[number];

/** `creative_id` usado nas estatísticas para o Google (sem criativo próprio). */
export const GOOGLE_CREATIVE_ID = '00000000-0000-0000-0000-000000000000';

export type AdSlotConfig = {
  slug: string;
  enabled: boolean;
  media: AdMedia[];
  googleWeight: number;
  googleAdUnit: string | null;
  rotateSeconds: number;
};

export type AdCreative = {
  id: string;
  format: AdFormat;
  kind: AdKind;
  imageUrl: string;
  alt: string;
  linkUrl: string;
  label: string;
  weight: number;
  startsAt: string | null;
  endsAt: string | null;
  cities: string[];
  slots: string[];
  active: boolean;
};

export type AdCandidate =
  | { type: 'own'; creative: AdCreative; weight: number }
  | { type: 'google'; adUnit: string; weight: number };
