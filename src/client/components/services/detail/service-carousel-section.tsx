import type { ServiceResult } from '../../search/search-types';
import { hueGradient, type ServiceDetailConfig } from './category-style';
import { ServiceCarousel } from './service-carousel';

/**
 * Trilha "veja também" — Server Component: recebe os resultados já buscados pela página e só
 * monta o título + `ServiceCarousel` (client, pelo drag/arrows do embla). Não renderiza nada
 * quando `services` está vazio, então um anúncio sem relacionados simplesmente pula a seção.
 */
export function ServiceCarouselSection({
  title,
  subtitleLabel,
  services,
  hue,
  detailConfig,
  className = 'mt-12 border-t border-border pt-8',
  moreHref,
  moreLabel,
  showCity,
}: {
  title: string;
  subtitleLabel?: string;
  services: ServiceResult[];
  /** Hue de acento da categoria do anúncio acima, pro marcador do título combinar. */
  hue?: number;
  detailConfig?: ServiceDetailConfig | null;
  /** Classes da `<section>`. Default = espaçamento/divisória da tela de detalhe; em outras telas
   * (ex. carrossel por categoria na home) passe o seu. */
  className?: string;
  /** Com `moreHref`, a trilha termina num card "Ver mais" que leva pra lá. */
  moreHref?: string;
  moreLabel?: string;
  /** Mostra a cidade nos cards (listas globais). Default: esconde. */
  showCity?: boolean;
}) {
  if (services.length === 0) return null;

  return (
    <section className={className}>
      <div className="mb-5 flex items-center gap-3">
        <span
          className="h-5 w-1 shrink-0 rounded-full"
          style={{ backgroundImage: hueGradient(hue ?? 230) }}
        />
        <div>
          <h2 className="font-display text-xl font-black leading-tight tracking-tight">{title}</h2>
          {subtitleLabel && <p className="text-xs text-muted-foreground">{subtitleLabel}</p>}
        </div>
      </div>

      <ServiceCarousel
        services={services}
        detailConfig={detailConfig}
        moreHref={moreHref}
        moreLabel={moreLabel}
        showCity={showCity}
      />
    </section>
  );
}
