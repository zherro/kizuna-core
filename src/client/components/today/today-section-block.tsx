import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarX } from 'lucide-react';
import { SectionHeading } from '../ui-better-soft/headers/section-heading';
import type { TodaySection } from '../../../server/services/today-feed-data';
import {
  ServiceCarouselSection,
  hueGradient,
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

const SECTION_CLASS = 'mx-auto w-full max-w-[1600px] px-4 pt-10 sm:px-6 sm:pt-12';

/**
 * Uma seção do "Hoje": título, quantos (nos eventos), os cards do carrossel de anúncio (estilo por
 * categoria via `serviceDetail`) e, quando há mais do que coube, o card "Ver mais" para a busca.
 * Sem item: some, ou — com `section.emptyText` — mostra o título e o aviso no lugar dos cards.
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
  const hue = resolveCategoryHue(
    section.kind === 'group' ? { groupSlug: section.category.slug } : { slug: section.category.slug },
    detailConfig
  );
  if (section.items.length === 0) {
    if (!section.emptyText) return null;
    return (
      <section className={SECTION_CLASS}>
        <SectionHeading title={section.title} accent={hueGradient(hue ?? 230)} />
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-muted/40 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarX aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="max-w-[60ch] text-sm leading-6 text-muted-foreground">{section.emptyText}</p>
          </div>
          <Link
            href={todaySearchHref(section, city)}
            className="inline-flex min-h-11 shrink-0 items-center self-start rounded-full border border-border bg-background px-4 text-sm font-semibold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
          >
            Ver a agenda completa
          </Link>
        </div>
      </section>
    );
  }
  return (
    <ServiceCarouselSection
      title={section.title}
      subtitleLabel={todaySectionSubtitle(section)}
      services={section.items}
      hue={hue}
      detailConfig={detailConfig}
      className={SECTION_CLASS}
      moreHref={section.hasMore ? todaySearchHref(section, city) : undefined}
      showCity={showCity}
      impressionRule={impressionRule}
      source={source}
      adSlot={adSlot}
    />
  );
}
