import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Sparkles, Tag, User, Zap } from 'lucide-react';
import { Typography } from '../../ui/typography';
import { ReviewSummary } from '../../reviews';
import { photosFor, formatServicePrice } from '../service-helpers';
import { PRICE_UNIT_LABEL } from '../service-labels';
import type { ServiceDetailData } from '../../../../server/services/service-detail-data';
import { hueGradient, resolveCategoryHue, resolveServiceDetailVariant } from './category-style';
import type { ServiceDetailConfig, ServiceDetailSlots, ServiceDetailVariantComponent } from './service-detail-types';
import { ServiceDetailDefault } from './service-detail-default';
import { ServiceDetailCinema, ServiceDetailCinemaSidebar, cinemaHeaderTags } from './service-detail-cinema';
import { AdPhotoMosaic } from './ad-photo-mosaic';
import { AdShareButton } from './ad-share-button';
import { ServiceReactionButtons } from './service-reaction-buttons';
import { ServiceCarouselSection } from './service-carousel-section';
import { TrackView } from '../../../analytics/track-view';
import type { EventRule } from '../../../../shared/analytics';

const BUILT_IN_VARIANTS: Record<string, ServiceDetailVariantComponent> = {
  service: ServiceDetailDefault,
  cinema: ServiceDetailCinema,
};

/** Conteúdo que substitui a caixa de preço da sidebar, por variant — variant sem entrada aqui
 * mantém a caixa de preço padrão (comportamento da `service`). */
const BUILT_IN_SIDEBARS: Record<string, ServiceDetailVariantComponent> = {
  cinema: ServiceDetailCinemaSidebar,
};

function ViewTracker({
  uid,
  rule,
  children,
}: {
  uid: string;
  rule: EventRule | null;
  children: ReactNode;
}) {
  if (!rule) return <>{children}</>;
  return (
    <TrackView entityType="service" entityId={uid} event="view" rule={rule}>
      {children}
    </TrackView>
  );
}

function ProviderAvatar({ url, name, className }: { url: string | null; name: string; className: string }) {
  const initials = name.trim().slice(0, 2).toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand font-black text-brand-foreground ${className}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagem servida pelo storage
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : initials ? (
        initials
      ) : (
        <User className="h-1/2 w-1/2" />
      )}
    </div>
  );
}

function BrandHero({ gradient, categoryName }: { gradient: string; categoryName: string | null }) {
  return (
    <div
      className="relative flex aspect-[16/10] w-full flex-col justify-end gap-1 overflow-hidden rounded-[1.75rem] p-6 text-white sm:aspect-[2/1] sm:p-10"
      style={{ backgroundImage: gradient }}
    >
      <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
        {categoryName ?? 'Serviço sob medida'}
      </span>
      <span className="text-sm text-white/75">Fotos em breve.</span>
    </div>
  );
}

export type ServiceDetailPageProps = {
  data: ServiceDetailData;
  /** Config `serviceDetail` do `kizuna.config.json` — sem ela, tudo cai no variant/hue default. */
  detailConfig?: ServiceDetailConfig | null;
  /** `variantByCategorySlug`/`defaultVariant` escolhem só entre este mapa; `cinema` e `service`
   * (default) já vêm prontos — passe aqui só pra adicionar/sobrescrever outra variant. */
  variants?: Record<string, ServiceDetailVariantComponent>;
  /** Substitui a caixa de preço da sidebar, por variant (`cinema` já vem pronto: título + gênero +
   * sinopse, só em telas lg+). Passe aqui só pra adicionar/sobrescrever outra variant. */
  sidebars?: Record<string, ServiceDetailVariantComponent>;
  slots?: ServiceDetailSlots;
  /** `/anuncios/[uid]` do projeto consumidor — usado pro breadcrumb, compartilhar e JSON-LD. */
  path: string;
  searchHref?: string;
  /** Plugin analytics: regra da visualização (`resolveEventRule`, calculada no servidor). Sem isso, nada é contado. */
  analytics?: { viewRule: EventRule | null };
};

/**
 * Tela de detalhe de um anúncio — genérica por categoria: o "miolo" (facts + seções) é escolhido
 * por `resolveServiceDetailVariant` (config `serviceDetail.variantByCategorySlug`, `"service"` se
 * a categoria não estiver mapeada); hero, título, sidebar e carrosséis de relacionados são comuns.
 * Sem fetch aqui dentro — quem chama já resolveu `data` via `loadServiceDetail` (server).
 */
export function ServiceDetailPage({
  data,
  detailConfig,
  variants,
  sidebars,
  slots,
  path,
  searchHref = '/busca',
  analytics,
}: ServiceDetailPageProps) {
  const { service, subcategoryNames, provider, extraFields, related, randomServices } = data;

  const categorySlug = service.category?.slug ?? null;
  const variantId = resolveServiceDetailVariant({ slug: categorySlug }, detailConfig);
  const hue = resolveCategoryHue({ slug: categorySlug }, detailConfig);
  const VariantContent = { ...BUILT_IN_VARIANTS, ...variants }[variantId] ?? ServiceDetailDefault;
  const headerTags = variantId === 'cinema' ? cinemaHeaderTags(extraFields) : [];
  const SidebarContent = { ...BUILT_IN_SIDEBARS, ...sidebars }[variantId];

  const photos = photosFor(service);
  const priceFull = formatServicePrice(service.startingPrice, service.priceUnit);
  const [priceAmount, priceUnitLabel] =
    service.priceUnit === 'quote' || !service.startingPrice
      ? ['Sob consulta', null]
      : [priceFull.split(' · ')[0], PRICE_UNIT_LABEL[service.priceUnit] ?? service.priceUnit];

  const providerDisplayName = provider?.full_name || provider?.display_name || '';

  const relatedScopeLabel =
    related.scope === 'group'
      ? `Outros em ${service.categoryGroup?.name ?? 'segmentos parecidos'}`
      : `Outros em ${service.category?.name ?? 'categorias parecidas'}`;

  const heroGradient = hueGradient(hue);

  return (
    <main className="relative min-h-screen bg-background pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          backgroundImage: `linear-gradient(to bottom, oklch(0.97 0.028 ${hue}), var(--background))`,
        }}
      />
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 py-5 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={searchHref} className="hover:text-foreground">
            Buscar
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-foreground">{service.title}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px] lg:gap-[38px]">
          <div className="min-w-0">
            {/* Só hero + título: a regra de visibilidade (fração do bloco) precisa caber numa tela. */}
            <ViewTracker uid={service.uid} rule={analytics?.viewRule ?? null}>
            <div className="relative">
              {photos.length > 0 ? (
                <AdPhotoMosaic photos={photos} alt={service.title} />
              ) : (
                <BrandHero gradient={heroGradient} categoryName={service.category?.name ?? null} />
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {service.category?.name ?? 'Serviço'}
                </span>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {service.sponsored && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      <Sparkles className="h-3 w-3" /> Patrocinado
                    </span>
                  )}
                  {service.urgentAvailable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      <Zap className="h-3 w-3" /> Atende urgência
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              {service.categoryGroup?.name && (
                <div className="text-sm font-semibold text-muted-foreground">
                  {service.categoryGroup.name}
                </div>
              )}
              <Typography.H1 className="mt-1" size={{ base: '2xl', sm: '2xl', lg: '3xl' }}>
                {service.title}
              </Typography.H1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <ReviewSummary domain="service" referenceId={String(service.id)} variant="compact" />
              </div>

              {(subcategoryNames.length > 0 || headerTags.length > 0) && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {subcategoryNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      <Tag className="h-3 w-3" /> {name}
                    </span>
                  ))}
                  {headerTags.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            </ViewTracker>

            <VariantContent
              service={service}
              extraFields={extraFields}
              subcategoryNames={subcategoryNames}
              hue={hue}
            />
          </div>

          <aside>
            <div className="rounded-[var(--ui-radius-card-lg,1.5rem)] bg-card p-6 shadow-xl lg:sticky lg:top-20">
              {SidebarContent ? (
                <div className="hidden lg:block">
                  <SidebarContent
                    service={service}
                    extraFields={extraFields}
                    subcategoryNames={subcategoryNames}
                    hue={hue}
                  />
                </div>
              ) : (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {priceUnitLabel ? 'A partir de' : 'Valor'}
                  </div>
                  <div className="mt-1 text-3xl font-black leading-none tracking-tight text-brand">
                    {priceAmount}
                  </div>
                  {priceUnitLabel && (
                    <div className="mt-1 text-sm font-medium text-muted-foreground">
                      · {priceUnitLabel}
                    </div>
                  )}
                </>
              )}

              <div className="mt-5 space-y-2">
                {slots?.renderCTA?.({ service, provider })}
                <ServiceReactionButtons
                  serviceUid={service.uid}
                  likeCount={service.likeCount ?? 0}
                  favoriteCount={service.favoriteCount ?? 0}
                  config={detailConfig?.reactions}
                  trackUid={analytics ? service.uid : undefined}
                />
                <AdShareButton
                  title={service.title}
                  path={path}
                  trackUid={analytics ? service.uid : undefined}
                />
              </div>

              {/* Cinema: o anúncio é o filme, não um prestador — não mostra "Quem anuncia". */}
              {provider && variantId !== 'cinema' &&
                (slots?.renderProviderCard?.({ provider }) ?? (
                  <div className="mt-5 flex items-center gap-3 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 p-3">
                    <ProviderAvatar
                      url={provider.avatar_url}
                      name={providerDisplayName}
                      className="h-10 w-10 text-xs"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">
                        {providerDisplayName || 'Prestador'}
                      </div>
                      <div className="text-xs text-muted-foreground">Quem anuncia</div>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                ))}
            </div>
          </aside>
        </div>

        <ServiceCarouselSection
          title="Também pode te interessar"
          subtitleLabel={relatedScopeLabel}
          services={related.items}
          hue={hue}
          detailConfig={detailConfig}
        />
        <ServiceCarouselSection
          title="Veja também"
          services={randomServices}
          hue={hue}
          detailConfig={detailConfig}
        />
      </div>
    </main>
  );
}
