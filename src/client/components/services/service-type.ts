export type {
  TaxonomyGroup as ServiceGroup,
  TaxonomyCategory as ServiceCategory,
  TaxonomySubcategory as ServiceSubcategory,
} from '../taxonomy/taxonomy-types';

/** `stripHtml` lives in the core text helper — re-exported here for the step components. */
export { stripHtml } from '../../../lib/helper/text.helper';

export type ServiceRecord = {
  id: string;
  uid: string;
  title: string;
  categoryGroupId: string | null;
  categoryGroup?: {
    id: string;
    name: string;
    slug?: string;
    active?: boolean;
    icon?: string;
  } | null;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug?: string;
    icon?: string;
  } | null;
  description: string;
  startingPrice: number;
  priceUnit: string;
  urgentAvailable: boolean;
  extras: Record<string, unknown>;
  status: string;
  sponsored: boolean;
  serviceLocation: string | null;
  active: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceSubcategoryLink = {
  id: string;
  serviceId: string;
  categoryGroupId: string | null;
  categoryId: string;
  categorySubId: string;
  active: boolean;
};

/**
 * The mutable state the services wizard carries across steps. Kept flat — every step reads and
 * `patch`es a subset. `groupId`/`categoryId`/`subcategoryIds` stay local until the `category`
 * step persists (they become `services` columns + `service_categories_sub` rows there).
 */
export type ServiceWizardState = {
  title: string;
  groupId: string;
  categoryId: string;
  subcategoryIds: string[];
  description: string;
  serviceLocation: string;
  startingPrice: number;
  priceUnit: string;
  imageIds: string[];
  decision: string;
  rejectionReason: string;
  decisionNote: string;
  /** Transient: validity reported by the dynamic per-category form step. Not a `services` column
   * (the resource `mapInput` ignores unknown keys), only drives that step's `canContinue`. */
  dynamicFormValid: boolean;
};

export const SERVICE_WIZARD_INITIAL_STATE: ServiceWizardState = {
  title: '',
  groupId: '',
  categoryId: '',
  subcategoryIds: [],
  description: '',
  serviceLocation: '',
  startingPrice: 0,
  priceUnit: 'quote',
  imageIds: [],
  decision: '',
  rejectionReason: '',
  decisionNote: '',
  dynamicFormValid: true,
};

export const SERVICE_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  active: 'Ativo',
  paused: 'Pausado',
  archived: 'Arquivado',
};

export const SERVICE_LOCATION_LABEL: Record<string, string> = {
  no_cliente: 'No cliente',
  no_estabelecimento: 'No estabelecimento',
  remoto: 'A Distância',
};

export const PRICE_UNIT_LABEL: Record<string, string> = {
  quote: 'sob consulta',
  service: 'por serviço',
  hour: 'por hora',
  fixed: 'fixo',
  unit: 'por unidade',
  visit: 'por visita',
  m2_metro_quadrado: 'por m²',
  project: 'por projeto',
  package: 'por pacote',
  monthly: 'mensal',
  day: 'por diária',
  km: 'por km',
};

/** Curated subset of `price_unit` shown in the service wizard — the SAME list for every group and
 * category. O enum no banco continua com o conjunto completo; aqui ficam só as opções do nicho de
 * eventos, com rótulo/《ajuda》na linguagem do nicho. */
export const SERVICE_PRICE_UNIT_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: 'day', label: 'Por diária', hint: 'Locação por dia — espaço, mesas, tenda, som' },
  {
    value: 'service',
    label: 'Por apresentação / evento',
    hint: 'Cachê fechado do show ou do serviço',
  },
  { value: 'hour', label: 'Por hora', hint: 'Ex.: 2h de show, hora de DJ' },
  { value: 'unit', label: 'Por pessoa / unidade', hint: 'Ex.: buffet por convidado' },
  { value: 'quote', label: 'Sob orçamento', hint: 'Você combina o valor no chat' },
];

/** Unidade de preço pré-selecionada conforme a categoria escolhida. É só um empurrão de UX — o
 * usuário sempre pode trocar. Cai em 'quote' pra qualquer slug novo. */
export function defaultPriceUnitForCategory(categorySlug?: string | null): string {
  switch (categorySlug) {
    case 'espacos-para-festas':
    case 'mesas-cadeiras-e-estrutura':
    case 'som-e-iluminacao':
      return 'day';
    case 'buffet-e-alimentacao':
      return 'unit';
    case 'musica-e-animacao':
      return 'service';
    default:
      return 'quote';
  }
}

export function fileUrl(id: string | number) {
  return `/api/public/storage/files/${id}/content`;
}

/** First image url for a service's card/hero — `extras.coverFileId`, falling back to the first of
 * `extras.images`. `services` has no dedicated image columns yet, so both live in `extras`. */
export function coverImage(service: Pick<ServiceRecord, 'extras'>): string | null {
  const images = service.extras?.images;
  const list = Array.isArray(images) ? images : [];
  const coverFileId = service.extras?.coverFileId;
  const cover = coverFileId ?? list[0] ?? null;
  return cover != null && cover !== '' ? fileUrl(cover as string | number) : null;
}

export function formatServicePrice(startingPrice: number, priceUnit: string) {
  if (priceUnit === 'quote' || !startingPrice) return 'Sob consulta';

  const amount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number(startingPrice));

  const unitLabel = PRICE_UNIT_LABEL[priceUnit] ?? priceUnit;
  return `${amount} · ${unitLabel}`;
}
