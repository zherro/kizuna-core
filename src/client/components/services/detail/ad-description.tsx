import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';

/**
 * Descrição de um anúncio. O texto costuma vir em Markdown (assistente/importador/editor); anúncios
 * antigos trazem HTML de editor rico. Decisão por conteúdo: com tag HTML de bloco/formatação cai no
 * caminho HTML SANITIZADO (lista fechada de tags, sem atributos, só links http/https/mailto);
 * senão é Markdown via `react-markdown` (não emite HTML cru e neutraliza `javascript:` por padrão).
 * Server-safe, sem estado.
 */

const HTML_HINT = /<\/?(?:p|br|ul|ol|li|h[1-6]|div|blockquote|strong|b|em|i|u|a|span|table|hr)\b[^>]*>/i;

/** O texto parece HTML de editor (e não Markdown)? */
export function isHtmlDescription(text: string): boolean {
  return HTML_HINT.test(text);
}

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'hr',
  'a',
]);
/** Tags cujo CONTEÚDO também é descartado (não só a tag). */
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function escapeText(s: string): string {
  // `&` que já é entidade (`&amp;`, `&#39;`) fica; o resto é escapado.
  return s
    .replace(/&(?!(?:[a-zA-Z]{2,8}|#\d{1,6}|#x[0-9a-fA-F]{1,5});)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeHref(raw: string): string | null {
  const v = raw.trim().replace(/&amp;/gi, '&');
  if (!/^(?:https?:\/\/|mailto:)/i.test(v)) return null;
  // Sem aspas/ângulos/espaços/controle: o valor entra num atributo entre aspas.
  if (/[\s"'<>`\u0000-\u001f]/.test(v)) return null;
  return v;
}

/**
 * HTML de editor → HTML seguro. Reconstrói a saída só com tags da lista fechada, sem atributos
 * (exceto `href` validado em `<a>`), e texto escapado: qualquer coisa fora disso vira texto ou some.
 */
export function sanitizeDescriptionHtml(html: string): string {
  const src = html.replace(DROP_WITH_CONTENT, '').replace(/<!--[\s\S]*?-->/g, '');
  const out: string[] = [];
  const token = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|<|[^<]+/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(src))) {
    if (m[2] === undefined) {
      out.push(escapeText(m[0]));
      continue;
    }
    const closing = m[1] === '/';
    let tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue;
    // Título dentro de um anúncio é só ênfase: h1–h6 viram h3 (o h2 é o título da seção).
    if (HEADINGS.has(tag)) tag = 'h3';
    if (closing) {
      if (tag !== 'br' && tag !== 'hr') out.push(`</${tag}>`);
      continue;
    }
    if (tag === 'a') {
      const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[3]);
      const safe = href ? safeHref(href[1] ?? href[2] ?? '') : null;
      out.push(
        safe
          ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">`
          : '<a>'
      );
      continue;
    }
    out.push(`<${tag}>`);
  }
  return out.join('');
}

const isExternal = (href?: string) => !!href && /^https?:\/\//i.test(href);

/* `node` (hast) vem do react-markdown e não pode ir para o DOM. */
/* eslint-disable @typescript-eslint/no-unused-vars */
const components: Components = {
  h1: ({ node, ...props }) => <h3 className="mb-2 mt-5 font-display text-base font-bold text-foreground first:mt-0" {...props} />,
  h2: ({ node, ...props }) => <h3 className="mb-2 mt-5 font-display text-base font-bold text-foreground first:mt-0" {...props} />,
  h3: ({ node, ...props }) => <h3 className="mb-2 mt-5 font-display text-base font-bold text-foreground first:mt-0" {...props} />,
  h4: ({ node, ...props }) => <h4 className="mb-1.5 mt-4 text-sm font-bold text-foreground first:mt-0" {...props} />,
  p: ({ node, ...props }) => <p className="my-3 text-pretty first:mt-0 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-brand first:mt-0 last:mb-0" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-brand first:mt-0 last:mb-0" {...props} />,
  li: ({ node, ...props }) => <li className="pl-0.5 [&>ol]:my-1.5 [&>ul]:my-1.5" {...props} />,
  a: ({ node, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
      {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  ),
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote className="my-4 border-l-4 border-brand/40 pl-4 text-muted-foreground" {...props} />
  ),
  hr: ({ node, ...props }) => <hr className="my-5 border-border" {...props} />,
  // Imagem solta num texto de anúncio não é esperada; as fotos têm galeria própria.
  img: () => null,
};
/* eslint-enable @typescript-eslint/no-unused-vars */

const PROSE_BASE = 'text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]';
const HTML_PROSE =
  '[&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand/40 [&_blockquote]:pl-4 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_li]:pl-0.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_p]:my-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5';

/** Quebra simples de linha vira quebra de verdade (texto digitado num textarea, sem Markdown). */
function keepLineBreaks(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/([^\n])\n(?=[^\n])/g, '$1  \n');
}

export function AdDescription({ text, className = '' }: { text: string; className?: string }) {
  const value = text.trim();
  if (!value) return null;

  if (isHtmlDescription(value)) {
    return (
      <div
        className={`${PROSE_BASE} ${HTML_PROSE} ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(value) }}
      />
    );
  }

  return (
    <div className={`${PROSE_BASE} ${className}`}>
      <Markdown components={components}>{keepLineBreaks(value)}</Markdown>
    </div>
  );
}
