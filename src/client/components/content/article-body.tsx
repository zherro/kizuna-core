import { ArticleMarkdown } from './article-markdown';

/** Corpo do artigo em Markdown, com largura de leitura confortável (cerca de 68 caracteres). */
export function ArticleBody({ markdown }: { markdown: string }) {
  if (markdown.trim() === '') return null;
  return (
    <div className="max-w-[68ch]">
      <ArticleMarkdown>{markdown}</ArticleMarkdown>
    </div>
  );
}
