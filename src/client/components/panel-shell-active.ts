/**
 * Item do menu do painel que fica marcado como ativo: entre os `hrefs` que casam com a rota (por
 * segmento), o mais específico (href mais longo). Sem isso, "/painel/meus-servicos/novo" acendia
 * também "/painel/meus-servicos". Uma subrota sem item próprio (ex.: editar
 * "/painel/meus-servicos/123") continua acendendo o pai. "/painel" só casa na rota exata — senão
 * ficaria ativo em toda tela sem item.
 */
export function activeNavHref(pathname: string, hrefs: readonly string[]): string | null {
  if (!pathname) return null;
  const matches = (href: string) =>
    href === '/painel'
      ? pathname === href
      : pathname === href || pathname.startsWith(href.endsWith('/') ? href : `${href}/`);
  return hrefs.filter(matches).sort((a, b) => b.length - a.length)[0] ?? null;
}
