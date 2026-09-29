import type { ReactNode } from 'react';
import type { ServiceRecord } from '../service-type';
import type { ServiceExtraFields, ProviderProfile } from '../../../../server/services/service-detail-data';

export type { CategoryStyleInput, ServiceDetailConfig, ServiceDetailVariant } from './category-style';

/** O que uma variant de conteúdo (`service`, `cinema`, ...) recebe — só o essencial pra desenhar o
 * "miolo" da página (facts strip + seções); hero, título, sidebar e carrosséis são comuns e ficam
 * no `ServiceDetailPage`. */
export type ServiceDetailVariantProps = {
  service: ServiceRecord;
  extraFields: ServiceExtraFields;
  subcategoryNames: string[];
  /** Hue (0-360) de acento da categoria, resolvido via `resolveCategoryHue`. */
  hue: number;
};

export type ServiceDetailVariantComponent = (props: ServiceDetailVariantProps) => ReactNode;

/** Pontos de extensão que o projeto consumidor injeta — o core não conhece plugins de
 * chat/solicitar/demandas, então essas ações ficam de fora por padrão (só `AdShareButton`
 * aparece sem slot nenhum). */
export type ServiceDetailSlots = {
  /** CTAs da sidebar, acima do compartilhar (ex. "Solicitar orçamento", "Iniciar conversa"). */
  renderCTA?: (ctx: {
    service: ServiceRecord;
    provider: ProviderProfile | null;
  }) => ReactNode;
  /** Substitui o card de prestador padrão da sidebar; `null` retornado por essa função remove o
   * bloco inteiro (útil quando o projeto não expõe perfil público de prestador). */
  renderProviderCard?: (ctx: { provider: ProviderProfile }) => ReactNode;
};
