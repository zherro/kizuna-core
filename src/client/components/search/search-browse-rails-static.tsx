import { ServiceCarouselSection } from '../services/detail/service-carousel-section';
import { resolveCategoryHue, type ServiceDetailConfig } from '../services/detail/category-style';
import type { BrowseRailsData } from '../../../shared/search/browse-rails';
import type { AnalyticsSource, EventRule } from '../../../shared/analytics';

// Quem chega já com filtro na URL (`/busca?q=x`) vê a vitrine por instantes até a página hidratar:
// este script (string fixa) esconde o bloco antes do primeiro paint.
const HIDE_WHEN_FILTERED =
  "if(location.search){var e=document.getElementById('busca-ssr');if(e)e.hidden=true;var l=document.getElementById('busca-ssr-loading');if(l)l.hidden=false}";

/**
 * Vitrine "sem filtro" da /busca renderizada no servidor (sem 'use client', sem estado): mesmas
 * trilhas do `SearchBrowseRails`, a partir de `loadBrowseRails`. A PÁGINA a renderiza FORA de qualquer
 * `<Suspense>` (dentro dele o servidor adia o trecho e o HTML estático sai sem as trilhas) e passa o
 * `id` dela (`busca-ssr`) ao `SearchPage` (`staticId`), que a esconde quando a localização fica pronta.
 * É isto que vai no HTML estático e pinta o LCP. Mesmo contêiner/largura do conteúdo do `SearchPage`.
 */
export function SearchBrowseRailsStatic({
  data,
  basePath = '/busca',
  detailConfig,
  impressionRule,
  source = 'search',
}: {
  data: BrowseRailsData;
  basePath?: string;
  detailConfig?: ServiceDetailConfig | null;
  impressionRule?: EventRule | null;
  source?: AnalyticsSource;
}) {
  const filled = data.rails.filter((r) => r.items.length > 0);
  if (filled.length === 0) return null;

  return (
    <div id="busca-ssr">
      {/* Reserva o espaço do cabeçalho da busca (título, campo e categorias), que só aparece depois de
          hidratar: sem isto as trilhas e o rodapé descem de uma vez (CLS). Alturas medidas na página
          hidratada: ~412px no celular/tablet, ~357px em lg+. */}
      <div className="h-[412px] border-b border-border bg-card lg:h-[357px]" aria-hidden />
      <section className="mx-auto w-full max-w-[1900px] px-4 py-6">
        {/* Mesma grade do SearchPage: em lg+ a 1ª coluna é a dos filtros (aqui vazia). */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          <div className="hidden lg:block" aria-hidden />
          <div className="min-w-0 space-y-10">
            <div className="space-y-12">
              {filled.map(({ rail, items, hasMore }, i) => (
                <ServiceCarouselSection
                  key={rail.groups.join('+')}
                  title={rail.title ?? rail.groups.map((g) => data.groupNames[g] ?? g).join(' e ')}
                  services={items}
                  hue={resolveCategoryHue({ groupSlug: rail.groups[0] }, detailConfig)}
                  detailConfig={detailConfig}
                  className=""
                  moreHref={hasMore ? `${basePath}?group=${encodeURIComponent(rail.groups[0])}` : undefined}
                  showCity
                  impressionRule={impressionRule}
                  source={source}
                  priorityFirst={i === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      <script dangerouslySetInnerHTML={{ __html: HIDE_WHEN_FILTERED }} />
    </div>
  );
}
