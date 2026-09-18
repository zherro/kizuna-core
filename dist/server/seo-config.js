/**
 * Config de SEO compartilhada entre projetos kizuna — hoje só o TTL de cache do `sitemap.ts`,
 * mas é o lugar certo para qualquer parâmetro de SEO que deva ser env-configurável em vez de
 * hardcoded por projeto (o motor é genérico; o valor de cada projeto não precisa ser).
 */
/** Nome da env de override do TTL de revalidate do sitemap dinâmico, em segundos. */
export const SEO_SITEMAP_CACHE_ENV = 'SEO_SITEMAP_CACHE';
const DEFAULT_SITEMAP_CACHE_SECONDS = 86400; // 24h — um sitemap não precisa de TTL curto
/** Lê `SEO_SITEMAP_CACHE` da env; ausente ou inválida cai no default de 24h. */
export function getSeoSitemapCacheSeconds() {
    const raw = process.env[SEO_SITEMAP_CACHE_ENV];
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SITEMAP_CACHE_SECONDS;
}
/** Nome da env de override do teto de itens por lista (services/pages/providers/groups) que o
 * sitemap busca no PostgREST — trava de segurança contra um catálogo crescer sem limite e o
 * sitemap virar uma consulta gigante/sem paginação real (o formato `sitemap.ts` do Next não
 * pagina sozinho). */
export const SEO_SITEMAP_PAGE_SIZE_ENV = 'SEO_SITEMAP_PAGE_SIZE';
const DEFAULT_SITEMAP_PAGE_SIZE = 5000;
/** Lê `SEO_SITEMAP_PAGE_SIZE` da env; ausente ou inválida cai no default de 5000. */
export function getSeoSitemapPageSize() {
    const raw = process.env[SEO_SITEMAP_PAGE_SIZE_ENV];
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : DEFAULT_SITEMAP_PAGE_SIZE;
}
//# sourceMappingURL=seo-config.js.map