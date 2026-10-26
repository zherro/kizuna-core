import type { ReactNode } from 'react';
import { ArticleByline } from '../../content/article-byline';
import { ArticleFigure } from '../../content/article-figure';
import { ArticleHeader } from '../../content/article-header';
import { ArticleSources } from '../../content/article-sources';
import { NewsTags } from '../../home/news-tags';
import { photosFor } from '../service-helpers';
import { AdDescription } from './ad-description';
import { AdShareButton } from './ad-share-button';
import { newsArticleMeta, type NewsArticleMeta } from './noticia-helpers';
import { ServiceReactionButtons } from './service-reaction-buttons';
import type { ServiceDetailFullPageComponent } from './service-detail-types';

/** Título do carrossel de relacionados nesta variant. */
export const NOTICIA_RELATED_TITLE = 'Mais notícias';

export type NewsArticleProps = {
  title: string;
  /** Saída de `newsArticleMeta` (chapéu, data, autor, fontes, crédito da foto). */
  meta: NewsArticleMeta;
  /** URL da foto de abertura; sem ela, a matéria abre direto no texto. */
  coverUrl?: string | null;
  /** Corpo (HTML de editor sanitizado, ou Markdown). */
  body: string;
  /** Ações da matéria (reagir, compartilhar): coluna fixa ao lado do texto no desktop, faixa sob
   * a foto no celular — um único conjunto no DOM, só reposicionado pelo grid. */
  actions?: ReactNode;
  /** Envolve título + foto (ex. contador de visualização). Default: nada. */
  trackView?: (node: ReactNode) => ReactNode;
};

/**
 * Matéria de jornal: chapéu (cor determinística pelo texto, a mesma do bloco de notícias da home),
 * título, linha de autor/data/tempo de leitura, foto de abertura com legenda e crédito, corpo em
 * largura de leitura (~68 caracteres) e as fontes no fim. Puro: recebe tudo pronto.
 */
export function NewsArticle({ title, meta, coverUrl, body, actions, trackView = (n) => n }: NewsArticleProps) {
  const credit = meta.photoCredit;

  return (
    <article className="mx-auto grid max-w-5xl grid-cols-1 gap-y-6 pt-2 sm:gap-y-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-x-14">
      {/* O rastreador pode envolver com um elemento próprio: o col-span fica num wrapper nosso. */}
      <div className="lg:col-span-2">
        {trackView(
          <div className="space-y-6 sm:space-y-8">
            <div className="max-w-4xl">
              <ArticleHeader
                tags={<NewsTags group={meta.group} category={meta.category} size="md" />}
                title={title}
                meta={
                  <ArticleByline
                    author={meta.author}
                    publishedAt={meta.publishedAt}
                    publishedLabel={meta.publishedLabel}
                    readingMinutes={meta.readingMinutes}
                  />
                }
              />
            </div>
            {coverUrl ? (
              <ArticleFigure
                src={coverUrl}
                alt={credit?.alt ?? credit?.caption ?? title}
                caption={credit?.caption}
                credit={credit}
                priority
              />
            ) : null}
          </div>
        )}
      </div>

      {actions ? (
        <div className="border-y border-border py-3 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:self-start lg:border-b-0 lg:pb-0 lg:pt-4">
          {actions}
        </div>
      ) : null}

      <div className="min-w-0 max-w-[68ch] lg:col-start-1 lg:row-start-2">
        <AdDescription text={body} variant="article" />
      </div>

      {meta.sources.length > 0 ? (
        <div className="max-w-[68ch] lg:col-start-1 lg:row-start-3">
          <ArticleSources sources={meta.sources} />
        </div>
      ) : null}
    </article>
  );
}

/** Gostei/Favoritar + Compartilhar: em linha no celular/tablet, empilhados na coluna do desktop. */
export function NewsArticleActions({ reactions, share }: { reactions: ReactNode; share: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
      <div className="sm:flex-1 lg:flex-none">{reactions}</div>
      <div className="sm:w-48 lg:w-auto">{share}</div>
    </div>
  );
}

/**
 * Variant `"noticia"` (página inteira) — o anúncio é uma MATÉRIA, não uma oferta: nada de preço,
 * avaliações, prestador nem mapa. Dados (ver `noticia-helpers.ts`): `data_publicacao`/`autor`/
 * `fonte`/`link` do formulário, `extras.fontes` e `extras.imagem_credito`; fuso de
 * `serviceDetail.timeZone`.
 */
export const ServiceDetailNoticia: ServiceDetailFullPageComponent = ({
  data,
  detailConfig,
  path,
  trackUid,
  trackView,
}) => {
  const { service, extraFields, subcategoryNames } = data;
  const meta = newsArticleMeta(service, extraFields, {
    subcategoryNames,
    timeZone: detailConfig?.timeZone,
  });

  return (
    <NewsArticle
      title={service.title}
      meta={meta}
      coverUrl={photosFor(service)[0] ?? null}
      body={service.description ?? ''}
      trackView={trackView}
      actions={
        <NewsArticleActions
          reactions={
            <ServiceReactionButtons
              serviceUid={service.uid}
              likeCount={service.likeCount ?? 0}
              config={detailConfig?.reactions}
              trackUid={trackUid}
            />
          }
          share={<AdShareButton title={service.title} path={path} trackUid={trackUid} />}
        />
      }
    />
  );
};
