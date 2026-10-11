import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';

const isExternal = (href?: string) => !!href && /^https?:\/\//i.test(href);

/**
 * Markdown do artigo, com escala tipográfica de leitura longa. Independente do `PageView`
 * (páginas institucionais): cada um evolui sem afetar o outro. Server component; `react-markdown`
 * não emite HTML cru do texto e neutraliza URLs perigosas (`javascript:`) por padrão.
 */
/* `node` (hast) vem do react-markdown e não pode ir para o DOM. */
/* eslint-disable @typescript-eslint/no-unused-vars */
const H2_CLASS =
  'mt-12 mb-3 scroll-mt-24 text-balance font-display text-2xl font-bold leading-snug tracking-tight text-foreground first:mt-0 sm:text-[1.7rem]';

const components: Components = {
  // O `<h1>` da página é o título do artigo; um `#` no corpo vira h2 (um único h1 por página).
  h1: ({ node, ...props }) => <h2 className={H2_CLASS} {...props} />,
  h2: ({ node, ...props }) => <h2 className={H2_CLASS} {...props} />,
  h3: ({ node, ...props }) => <h3 className="mt-8 mb-2 scroll-mt-24 text-balance font-display text-xl font-semibold leading-snug text-foreground first:mt-0" {...props} />,
  p: ({ node, ...props }) => <p className="my-5 text-pretty text-[1.0625rem] leading-8 text-foreground/90" {...props} />,
  ul: ({ node, ...props }) => <ul className="my-5 list-disc space-y-2 pl-6 text-[1.0625rem] leading-8 text-foreground/90 marker:text-brand" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-5 list-decimal space-y-2 pl-6 text-[1.0625rem] leading-8 text-foreground/90 marker:font-semibold marker:text-brand" {...props} />,
  a: ({ node, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
      {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-8 border-l-4 border-brand/40 pl-5 font-display text-lg leading-8 text-muted-foreground"
      {...props}
    />
  ),
  hr: ({ node, ...props }) => <hr className="my-10 border-border" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  img: ({ node, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element -- imagens do conteúdo vêm de public/
    <img alt={alt ?? ''} className="my-6 w-full rounded-2xl" loading="lazy" {...props} />
  ),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export function ArticleMarkdown({ children }: { children: string }) {
  return <Markdown components={components}>{children}</Markdown>;
}
