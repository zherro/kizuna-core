import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { PageRecord } from './page-types';

/**
 * SERVER component (no `'use client'`) — the first server component shipped in a kizuna plugin.
 * Renders a `pages` row: the title, then the Markdown `content` as a React element tree via
 * `react-markdown`. No `dangerouslySetInnerHTML` — `react-markdown` does not emit raw HTML from
 * the source by default, so untrusted Markdown cannot inject script/embed nodes.
 *
 * Styling is a small self-contained `md-body` prose scale applied through the `components` map
 * (Tailwind utility classes), so it needs no global stylesheet or typography plugin in the
 * consuming app.
 */
const mdComponents: Components = {
  h1: (props) => <h1 className="mt-8 mb-4 text-2xl font-black tracking-tight first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-8 mb-3 text-xl font-bold tracking-tight" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 text-lg font-semibold" {...props} />,
  p: (props) => <p className="my-4 leading-7 text-foreground/90" {...props} />,
  ul: (props) => <ul className="my-4 list-disc space-y-1.5 pl-6" {...props} />,
  ol: (props) => <ol className="my-4 list-decimal space-y-1.5 pl-6" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  a: (props) => (
    <a className="font-medium text-primary underline underline-offset-2" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="my-4 border-l-4 border-border pl-4 italic text-muted-foreground" {...props} />
  ),
  hr: (props) => <hr className="my-8 border-border" {...props} />,
  code: (props) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]" {...props} />
  ),
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  table: (props) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border border-border px-3 py-2 text-left font-semibold" {...props} />,
  td: (props) => <td className="border border-border px-3 py-2" {...props} />,
};

export function PageView({ page }: { page: PageRecord }) {
  return (
    <article className="md-body">
      <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
        {page.title}
      </h1>
      {page.description ? (
        <p className="mt-3 text-base text-muted-foreground">{page.description}</p>
      ) : null}
      <div className="mt-6">
        <Markdown components={mdComponents}>{page.content ?? ''}</Markdown>
      </div>
    </article>
  );
}
