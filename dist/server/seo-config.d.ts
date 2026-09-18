/**
 * Config de SEO compartilhada entre projetos kizuna — hoje só o TTL de cache do `sitemap.ts`,
 * mas é o lugar certo para qualquer parâmetro de SEO que deva ser env-configurável em vez de
 * hardcoded por projeto (o motor é genérico; o valor de cada projeto não precisa ser).
 */
/** Nome da env de override do TTL de revalidate do sitemap dinâmico, em segundos. */
export declare const SEO_SITEMAP_CACHE_ENV = "SEO_SITEMAP_CACHE";
/** Lê `SEO_SITEMAP_CACHE` da env; ausente ou inválida cai no default de 24h. */
export declare function getSeoSitemapCacheSeconds(): number;
/** Nome da env de override do teto de itens por lista (services/pages/providers/groups) que o
 * sitemap busca no PostgREST — trava de segurança contra um catálogo crescer sem limite e o
 * sitemap virar uma consulta gigante/sem paginação real (o formato `sitemap.ts` do Next não
 * pagina sozinho). */
export declare const SEO_SITEMAP_PAGE_SIZE_ENV = "SEO_SITEMAP_PAGE_SIZE";
/** Lê `SEO_SITEMAP_PAGE_SIZE` da env; ausente ou inválida cai no default de 5000. */
export declare function getSeoSitemapPageSize(): number;
//# sourceMappingURL=seo-config.d.ts.map