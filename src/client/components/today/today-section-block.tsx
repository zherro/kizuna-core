import type { ReactNode } from 'react';
import type { TodaySection } from '../../../server/services/today-feed-data';
import {
  ServiceCarouselSection,
  resolveCategoryHue,
  type ServiceDetailConfig,
} from '../services/detail';
import type { AnalyticsSource, EventRule } from '../../../shared/analytics';
import { todaySearchHref, todaySectionSubtitle, type TodayCity } from './today-format';

export type TodaySectionBlockProps = {
  section: TodaySection;
  detailConfig?: ServiceDetailConfig | null;
  /** Página de uma cidade: filtra o "Ver mais" por ela. */
  city?: TodayCity | null;
  /** Mostra a cidade nos cards (seção de região, com cidades irmãs). */
  showCity?: boolean;
  impressionRule?: EventRule | null;
  source?: AnalyticsSource;
  adSlot?: ReactNode;
};

/**
 * Uma seção do "Hoje": título, quantos (nos eventos), os cards do carrossel de anúncio (estilo por
 * categoria via `serviceDetail`) e, quando há mais do que coube, o card "Ver mais" para a busca.
 */
export function TodaySectionBlock({
  section,
  detailConfig,
  city,
  showCity,
  impressionRule,
  source = 'home',
  adSlot,
}: TodaySectionBlockProps) {
  if (section.items.length === 0) return null;
  const hue = resolveCategoryHue(
    section.kind === 'group' ? { groupSlug: section.category.slug } : { slug: section.category.slug },
    detailConfig
  );
  return (
    <ServiceCarouselSection
      title={section.title}
      subtitleLabel={todaySectionSubtitle(section)}
      services={section.items}
      hue={hue}
      detailConfig={detailConfig}
      className="mx-auto w-full max-w-[1600px] px-4 pt-10 sm:px-6 sm:pt-12"
      moreHref={section.hasMore ? todaySearchHref(section, city) : undefined}
      showCity={showCity}
      impressionRule={impressionRule}
      source={source}
      adSlot={adSlot}
    />
  );
}
