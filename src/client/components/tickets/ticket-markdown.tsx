import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';

/* `node` (hast) vem do react-markdown e não pode ir para o DOM. */
/* eslint-disable @typescript-eslint/no-unused-vars */
const components: Components = {
  p: ({ node, ...props }) => <p className="my-1 first:mt-0 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="my-1 list-disc space-y-0.5 pl-5" {...props} />,
  ol: ({ node, ...props }) => <ol className="my-1 list-decimal space-y-0.5 pl-5" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="font-medium text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="my-1 border-l-2 border-border pl-3 text-muted-foreground" {...props} />
  ),
  code: ({ node, ...props }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  h1: ({ node, ...props }) => <p className="my-1 font-semibold" {...props} />,
  h2: ({ node, ...props }) => <p className="my-1 font-semibold" {...props} />,
  h3: ({ node, ...props }) => <p className="my-1 font-semibold" {...props} />,
  // Imagens vão pelos anexos; markdown de imagem externa não é renderizado.
  img: () => null,
};

/** Texto de mensagem do chamado (markdown enxuto, sem HTML cru). */
export function TicketMarkdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [overflow-wrap:anywhere]">
      <Markdown components={components}>{children}</Markdown>
    </div>
  );
}
