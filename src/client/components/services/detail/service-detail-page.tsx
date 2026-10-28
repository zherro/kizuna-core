import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Sparkles, Tag, User, Zap } from 'lucide-react';
import { Typography } from '../../ui/typography';
import { ReviewSummary } from '../../reviews';
import { photosFor, formatServicePrice } from '../service-helpers';
import { PRICE_UNIT_LABEL } from '../service-labels';
import type { ServiceDetailData } from '../../../../server/services/service-detail-data';
import { hueGradient, resolveCategoryHue, resolveSectionTitles, resolveServiceDetailVariant } from './category-style';
import type {
  ServiceDetailConfig,
  ServiceDetailFullPageComponent,
  ServiceDetailSlots,
  ServiceDetailVariantComponent,
} from './service-detail-types';
import { ServiceDetailDefault } from './service-detail-default';
import { ServiceDetailLugar, ServiceDetailLugarSidebar } from './service-detail-lugar';
import { ServiceDetailCinema, ServiceDetailCinemaSidebar, cinemaHeaderTags } from './service-detail-cinema';
import { ServiceDetailEvento, ServiceDetailEventoSidebar, eventoHeaderTags } from './service-detail-evento';
import { NOTICIA_RELATED_TITLE, ServiceDetailNoticia } from './service-detail-noticia';
import { ServiceLocationSection } from './service-location-section';
import { AdPhotoMosaic } from './ad-photo-mosaic';
import { AdShareButton } from './ad-share-button';
import { RootEditLink } from './root-edit-link';
import { ServiceReactionButtons } from './service-reaction-buttons';
import { ServiceCarouselSection } from './service-carousel-section';
import { AdTrackingProvider, SourcedTrackView } from '../../../analytics/ad-tracking';
import type { EventRule } from '../../../../shared/analytics';
import { DEFAULT_LINKED_TITLE } from '../../../../shared/service-tags';

const BUILT_IN_VARIANTS: Record<string, ServiceDetailVariantComponent> = {
  service: ServiceDetailDefault,
  cinema: ServiceDetailCinema,
  evento: ServiceDetailEvento,
  lugar: ServiceDetailLugar,
};

/** Conteúdo que substitui a caixa de preço da sidebar, por variant — variant sem entrada aqui
 * mantém a caixa de preço padrão (comportamento da `service`). */
const BUILT_IN_SIDEBARS: Record<string, ServiceDetailVariantComponent> = {
  cinema: ServiceDetailCinemaSidebar,
  evento: ServiceDetailEventoSidebar,
  lugar: ServiceDetailLugarSidebar,
};

/** Variants de PÁGINA INTEIRA: trocam hero + título + miolo + sidebar por um layout próprio
 * (só fundo, breadcrumb e carrosséis continuam comuns). Têm precedência sobre `BUILT_IN_VARIANTS`. */
const BUILT_IN_FULL_PAGES: Record<string, ServiceDetailFullPageComponent> = {
  noticia: ServiceDetailNoticia,
};

/** Título do carrossel de relacionados por variant (default "Também pode te interessar"). */
const RELATED_TITLES: Record<string, string> = {
  noticia: NOTICIA_RELATED_TITLE,
};

/** Tags extras sob o título, por variant (idiomas/formatos, classificação...). */
const HEADER_TAGS: Record<string, (extraFields: ServiceDetailData['extraFields']) => string[]> = {
  cinema: cinemaHeaderTags,
  evento: eventoHeaderTags,
};

/** Variants em que o anúncio É o conteúdo (filme, evento, lugar), não um prestador: sem "Quem anuncia". */
const HIDE_PROVIDER_CARD = new Set(['cinema', 'evento', 'lugar']);

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
    <SourcedTrackView uid={uid} event="view" rule={rule}>
      {children}
    </SourcedTrackView>
  );
}

function MaybeTracking({ uid, children }: { uid: string | null; children: ReactNode }) {
  if (!uid) return <>{children}</>;
  return <AdTrackingProvider uid={uid}>{children}</AdTrackingProvider>;
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
  /** Variants de página inteira (`noticia` já vem pronta). Passe aqui só pra adicionar/sobrescrever. */
  fullPages?: Record<string, ServiceDetailFullPageComponent>;
  slots?: ServiceDetailSlots;
  /** `/anuncios/[uid]` do projeto consumidor — usado pro breadcrumb, compartilhar e JSON-LD. */
  path: string;
  searchHref?: string;
  /** Plugin analytics: regra da visualização (`resolveEventRule`, calculada no servidor). Sem isso, nada é contado. */
  analytics?: { viewRule: EventRule | null };
  /** Tela de edição deste anúncio no painel: com ela, root vê um botão "Editar" no topo. */
  editHref?: string;
};

/**
 * Tela de detalhe de um anúncio — genérica por categoria: o "miolo" (facts + seções) é escolhido
 * por `resolveServiceDetailVariant` (config `serviceDetail.variantByCategorySlug`, `"service"` se
 * a categoria não estiver mapeada); hero, título, sidebar e carrosséis de relacionados são comuns.
 * Sem fetch aqui dentro — quem chama já resolveu `data` via `loadServiceDetail` (server).
 */
export const LUGAR_AGENDA_TITLE = 'Agenda deste local';

export function ServiceDetailPage({
  data,
  detailConfig,
  variants,
  sidebars,
  fullPages,
  slots,
  path,
  searchHref = '/busca',
  analytics,
  editHref,
}: ServiceDetailPageProps) {
  const { service, subcategoryNames, provider, extraFields, related, tagRails, randomServices, siblings, location } = data;

  const styleInput = { slug: service.category?.slug ?? null, groupSlug: service.categoryGroup?.slug ?? null };
  const variantId = resolveServiceDetailVariant(styleInput, detailConfig);
  const hue = resolveCategoryHue(styleInput, detailConfig);
  const labels = resolveSectionTitles(styleInput, detailConfig);
  const VariantContent = { ...BUILT_IN_VARIANTS, ...variants }[variantId] ?? ServiceDetailDefault;
  const headerTags = HEADER_TAGS[variantId]?.(extraFields) ?? [];
  const SidebarContent = { ...BUILT_IN_SIDEBARS, ...sidebars }[variantId];
  const fullPageMap: Partial<Record<string, ServiceDetailFullPageComponent>> = { ...BUILT_IN_FULL_PAGES, ...fullPages };
  const FullPage = fullPageMap[variantId];

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
    <MaybeTracking uid={analytics ? service.uid : null}>
    <main className="relative min-h-screen bg-background pb-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{
          // Tinta derivada do próprio --background (mesma luminosidade, matiz da categoria): no claro
          // fica ~0.97 como antes; no escuro vira um tom escuro em vez de uma faixa clara sob o
          // breadcrumb/título (que, no tema escuro, são claros).
          backgroundImage: `linear-gradient(to bottom, oklch(from var(--background) calc(l * 0.975) 0.028 ${hue}), var(--background))`,
        }}
      />
      <div className="relative mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1 py-5 text-xs text-muted-foreground">
          {/* -my-1 py-1: área de toque de 24px sem mudar a altura do breadcrumb */}
          <Link href="/" className="-my-1 py-1 hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="h-3 w-3" />
          {FullPage && service.categoryGroup?.slug ? (
            // Página inteira (ex. notícia): o meio do caminho é a seção, não a busca genérica.
            <Link
              href={`${searchHref}?group=${encodeURIComponent(service.categoryGroup.slug)}`}
              className="-my-1 shrink-0 py-1 hover:text-foreground"
            >
              {service.categoryGroup.name}
            </Link>
          ) : (
            <Link href={searchHref} className="-my-1 py-1 hover:text-foreground">
              Buscar
            </Link>
          )}
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="truncate text-foreground">{service.title}</span>
          {editHref && <RootEditLink href={editHref} />}
        </nav>

        {FullPage ? (
          <FullPage
            data={data}
            hue={hue}
            labels={labels}
            detailConfig={detailConfig}
            path={path}
            trackUid={analytics ? service.uid : undefined}
            trackView={(node) => (
              <ViewTracker uid={service.uid} rule={analytics?.viewRule ?? null}>
                {node}
              </ViewTracker>
            )}
            slots={slots}
          />
        ) : (
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
              labels={labels}
              siblings={siblings ?? []}
              organizer={data.organizer ?? null}
              venue={data.venue ?? null}
              location={location ?? null}
              salePoints={data.salePoints ?? null}
              artists={data.artists ?? null}
              renderVenueCard={slots?.renderVenueCard}
            />

            {/* Cinema/evento têm tratamento próprio de local — a seção é das variants `service` e `lugar`. */}
            {(variantId === 'service' || variantId === 'lugar') && (
              <ServiceLocationSection
                location={location ?? null}
                title={service.title}
                hue={hue}
                placeMode={variantId === 'lugar'}
              />
            )}
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
                    labels={labels}
                    venue={data.venue ?? null}
                    location={location ?? null}
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
                  config={detailConfig?.reactions}
                  trackUid={analytics ? service.uid : undefined}
                />
                <AdShareButton
                  title={service.title}
                  path={path}
                  trackUid={analytics ? service.uid : undefined}
                />
              </div>

              {/* Cinema/evento: o anúncio é o filme/evento, não um prestador — sem "Quem anuncia". */}
              {provider && !HIDE_PROVIDER_CARD.has(variantId) &&
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
        )}

        {(tagRails ?? []).map((rail) => (
          <ServiceCarouselSection
            key={rail.tag}
            // Num lugar, os vinculados (sem `vinculosTitulo`) são os eventos que acontecem nele.
            title={variantId === 'lugar' && rail.title === DEFAULT_LINKED_TITLE ? LUGAR_AGENDA_TITLE : rail.title}
            services={rail.items}
            hue={hue}
            detailConfig={detailConfig}
          />
        ))}
        <ServiceCarouselSection
          title={RELATED_TITLES[variantId] ?? 'Também pode te interessar'}
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
    </MaybeTracking>
  );
}
