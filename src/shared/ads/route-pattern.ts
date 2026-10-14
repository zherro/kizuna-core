export const DEFAULT_STATIC_ROOTS = [
  'busca', 'descobrir', 'anuncios', 'lugares', 'noticias', 'curtidos', 'contato', 'sobre', 'painel',
] as const;

/** `/anuncios/abc` → `/anuncios/[id]`; `/cuiaba/bares` → `/[cidade]/[id]`. Nunca devolve a URL real. */
export function routePattern(pathname: string, staticRoots: readonly string[] = DEFAULT_STATIC_ROOTS): string {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  const [first, ...rest] = parts;
  const head = staticRoots.includes(first) ? first : '[cidade]';
  return '/' + [head, ...rest.map(() => '[id]')].join('/');
}
