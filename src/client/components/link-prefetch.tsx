'use client';

import Link from 'next/link';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';

/**
 * Política de pré-carregamento (prefetch) dos links de LISTAS de cards (resultados da busca,
 * trilhas, carrossel de categorias). Cada card visível dispara um prefetch da página de destino no
 * padrão do Next — no celular/4G isso disputa banda com a própria página. Sem provider (ou
 * `cards` omitido) vale o padrão do Next, como sempre foi.
 */
type LinkPrefetchPolicy = {
  /** `false` = cards não pré-carregam (só ao tocar). Omitido = padrão do Next. */
  cards?: boolean;
};

const LinkPrefetchContext = createContext<LinkPrefetchPolicy>({});

export function LinkPrefetchProvider({
  cards,
  children,
}: LinkPrefetchPolicy & { children: ReactNode }) {
  return <LinkPrefetchContext.Provider value={{ cards }}>{children}</LinkPrefetchContext.Provider>;
}

/** `prefetch` a passar ao `<Link>` de um card: `false` se a política desligou; senão o padrão. */
export function useCardPrefetch(): false | undefined {
  return useContext(LinkPrefetchContext).cards === false ? false : undefined;
}

/**
 * `<Link>` de card que segue a política (`LinkPrefetchProvider`). Pode ser usado por componente de
 * servidor (é um componente de cliente, como o próprio `next/link`). `prefetch` explícito vence.
 */
export function CardLink({ prefetch, ...props }: ComponentProps<typeof Link>) {
  const policy = useCardPrefetch();
  return <Link prefetch={prefetch ?? policy} {...props} />;
}
