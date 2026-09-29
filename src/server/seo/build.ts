import type { Metadata } from 'next';

/**
 * Parâmetros de SEO do site (nome, URL base, imagem padrão) — o core não tem opinião sobre esses
 * valores (variam por projeto), então toda função aqui recebe `site` explícito. Um projeto monta
 * o seu a partir do `site` do `kizuna.config.json` (nome, url) uma vez e reusa em toda página.
 */
export type SeoSite = {
  name: string;
  /** URL pública, sem barra no final (ex. `https://meusite.com.br`). */
  url: string;
  defaultDescription: string;
  defaultOgImage: string;
  locale?: string;
  twitterSite?: string;
};

export function absoluteUrl(site: Pick<SeoSite, 'url'>, path: string): string {
  return new URL(path, site.url).toString();
}

export type SeoContext = {
  /** Título da página (sem sufixo — o `title.template` do layout raiz já adiciona `" | <site>"`). */
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
};

/** HTML já sanitizado no schema (nunca texto cru de usuário) → plain text curto pra meta description. */
export function stripHtml(html: string | null | undefined, maxLength = 160): string | undefined {
  const text = (html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/** Constrói o `Metadata` de uma página pública a partir do contexto — OG/Twitter sempre herdam os
 * mesmos campos, então uma rota nova só precisa preencher `SeoContext`. */
export function buildMetadata(site: SeoSite, ctx: SeoContext): Metadata {
  const description = ctx.description || site.defaultDescription;
  const image = absoluteUrl(site, ctx.image || site.defaultOgImage);
  const url = absoluteUrl(site, ctx.path);

  return {
    title: ctx.title,
    description,
    alternates: { canonical: url },
    ...(ctx.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: ctx.title,
      description,
      url,
      siteName: site.name,
      locale: site.locale ?? 'pt_BR',
      type: ctx.type ?? 'website',
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ctx.title,
      description,
      images: [image],
      ...(site.twitterSite ? { site: site.twitterSite } : {}),
    },
  };
}

/** JSON-LD como string pronta pro `<script type="application/ld+json">` — nunca interpolar HTML de
 * usuário direto no objeto sem passar por `stripHtml` antes. */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}

export function serviceJsonLd(
  site: SeoSite,
  input: {
    name: string;
    description?: string;
    path: string;
    image?: string | null;
    price?: number | null;
    priceCurrency?: string;
    category?: string | null;
    areaServed?: string | null;
    providerName?: string | null;
  }
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url: absoluteUrl(site, input.path),
    image: input.image ? absoluteUrl(site, input.image) : undefined,
    category: input.category ?? undefined,
    areaServed: input.areaServed ?? undefined,
    provider: input.providerName ? { '@type': 'Person', name: input.providerName } : undefined,
    ...(input.price
      ? {
          offers: {
            '@type': 'Offer',
            price: input.price,
            priceCurrency: input.priceCurrency ?? 'BRL',
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(
  site: SeoSite,
  items: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(site, item.path),
    })),
  };
}
