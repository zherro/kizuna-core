import type { ReactNode } from 'react';
import type { ServiceDetailLabels } from './category-style';
import type { ServiceRecord } from '../service-type';
import type { ServiceExtraFields, ProviderProfile, ServiceLocation, ServiceOrganizer, ServiceVenue } from '../../../../server/services/service-detail-data';
import type { ServiceSibling } from '../../../../server/services/service-siblings';

export type { CategoryStyleInput, SectionTitlesConfig, ServiceDetailLabels, ReactionButtonConfig, ServiceDetailConfig, ServiceDetailVariant } from './category-style';

/** O que uma variant de conteúdo (`service`, `cinema`, ...) recebe — só o essencial pra desenhar o
 * "miolo" da página (facts strip + seções); hero, título, sidebar e carrosséis são comuns e ficam
 * no `ServiceDetailPage`. */
export type ServiceDetailVariantProps = {
  service: ServiceRecord;
  extraFields: ServiceExtraFields;
  subcategoryNames: string[];
  /** Hue (0-360) de acento da categoria, resolvido via `resolveCategoryHue`. */
  hue: number;
  /** Títulos de seção resolvidos por categoria/grupo (`serviceDetail.sectionTitles`). */
  labels: ServiceDetailLabels;
  /** O mesmo anúncio nas cidades irmãs (`regions`) — a variant decide se/como mostra. */
  siblings?: ServiceSibling[];
  /** Casa/local que organiza o anúncio (tag `local:<slug>`), quando resolvida — usada pelo evento. */
  organizer?: ServiceOrganizer | null;
  /** Local onde o evento acontece (anúncio da variant `lugar`), quando resolvido. */
  venue?: ServiceVenue | null;
  /** Endereço principal do próprio anúncio (passo de endereço do wizard, `service_addresses`). */
  location?: ServiceLocation | null;
  /** Pontos de venda resolvidos (`ServiceDetailData.salePoints`): com `venue`, viram link para o
   * local; sem, só o `label`. Ausente → a variant usa `answers.pontos_de_venda` cru. */
  salePoints?: ServiceSalePoint[] | null;
  /** Artistas resolvidos (`ServiceDetailData.artists`): com `venue`, link para o anúncio; sem, para a
   * busca pelo nome. Ausente → `answers.artistas` cru, também linkando para a busca. */
  artists?: ServiceSalePoint[] | null;
  /** `ServiceDetailSlots.renderVenueCard` repassado pela página. */
  renderVenueCard?: ServiceDetailSlots['renderVenueCard'];
};

/** `link`: URL de compra do ingresso naquele ponto (só pontos de venda; validada com `safeHttpUrl`). */
export type ServiceSalePoint = { label: string; venue: ServiceVenue | null; link?: string };

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
  /** Substitui o card "Onde acontece" do evento (local resolvido em `data.venue`). */
  renderVenueCard?: (ctx: { venue: ServiceVenue }) => ReactNode;
};
