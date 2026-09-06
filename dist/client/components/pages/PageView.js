import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Markdown from 'react-markdown';
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
const mdComponents = {
    h1: (props) => _jsx("h1", { className: "mt-8 mb-4 text-2xl font-black tracking-tight first:mt-0", ...props }),
    h2: (props) => _jsx("h2", { className: "mt-8 mb-3 text-xl font-bold tracking-tight", ...props }),
    h3: (props) => _jsx("h3", { className: "mt-6 mb-2 text-lg font-semibold", ...props }),
    p: (props) => _jsx("p", { className: "my-4 leading-7 text-foreground/90", ...props }),
    ul: (props) => _jsx("ul", { className: "my-4 list-disc space-y-1.5 pl-6", ...props }),
    ol: (props) => _jsx("ol", { className: "my-4 list-decimal space-y-1.5 pl-6", ...props }),
    li: (props) => _jsx("li", { className: "leading-7", ...props }),
    a: (props) => (_jsx("a", { className: "font-medium text-primary underline underline-offset-2", ...props })),
    blockquote: (props) => (_jsx("blockquote", { className: "my-4 border-l-4 border-border pl-4 italic text-muted-foreground", ...props })),
    hr: (props) => _jsx("hr", { className: "my-8 border-border", ...props }),
    code: (props) => (_jsx("code", { className: "rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]", ...props })),
    strong: (props) => _jsx("strong", { className: "font-semibold text-foreground", ...props }),
    table: (props) => (_jsx("div", { className: "my-4 overflow-x-auto", children: _jsx("table", { className: "w-full border-collapse text-sm", ...props }) })),
    th: (props) => _jsx("th", { className: "border border-border px-3 py-2 text-left font-semibold", ...props }),
    td: (props) => _jsx("td", { className: "border border-border px-3 py-2", ...props }),
};
export function PageView({ page }) {
    return (_jsxs("article", { className: "md-body", children: [_jsx("h1", { className: "text-3xl font-black tracking-tight text-foreground sm:text-4xl", children: page.title }), page.description ? (_jsx("p", { className: "mt-3 text-base text-muted-foreground", children: page.description })) : null, _jsx("div", { className: "mt-6", children: _jsx(Markdown, { components: mdComponents, children: page.content ?? '' }) })] }));
}
//# sourceMappingURL=PageView.js.map