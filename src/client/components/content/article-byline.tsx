import type { ReactNode } from 'react';

export type ArticleBylineProps = {
  /** Quem assina ("Redação", "Fulano de Tal"). */
  author?: string | null;
  /** Instante de publicação — vira o `dateTime` do `<time>`. */
  publishedAt?: Date | null;
  /** Data já formatada pra leitura ("25 de outubro de 2026, 8h"). Sem ela, a data não aparece. */
  publishedLabel?: string | null;
  /** Minutos de leitura; `null`/ausente omite. */
  readingMinutes?: number | null;
};

/**
 * Linha de metadados de uma matéria: autor, data de publicação e tempo de leitura, separados por
 * um fio vertical discreto. Item ausente some sem deixar separador sobrando; tudo ausente → `null`.
 *
 * O fio é desenhado à esquerda de CADA item e a lista é puxada 0.75rem para a esquerda dentro de um
 * contêiner `overflow-hidden`: o fio do primeiro item de cada linha cai fora da área visível. Assim,
 * quando a linha quebra (coluna estreita, data longa), nenhum fio fica pendurado no fim/início.
 */
export function ArticleByline({ author, publishedAt, publishedLabel, readingMinutes }: ArticleBylineProps) {
  const items: { key: string; node: ReactNode; className?: string }[] = [];
  if (author?.trim()) {
    items.push({
      key: 'author',
      // No celular o autor fica sozinho na 1ª linha.
      className: 'basis-full sm:basis-auto',
      node: (
        <>
          Por <span className="font-semibold text-foreground">{author.trim()}</span>
        </>
      ),
    });
  }
  if (publishedLabel) {
    items.push({
      key: 'date',
      node: <time dateTime={publishedAt ? publishedAt.toISOString() : undefined}>{publishedLabel}</time>,
    });
  }
  if (readingMinutes && readingMinutes > 0) {
    items.push({ key: 'reading', node: `${readingMinutes} min de leitura` });
  }
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden text-sm leading-6 text-muted-foreground">
      <p className="-ml-3 flex flex-wrap items-center gap-y-1">
        {items.map((item) => (
          <span
            key={item.key}
            className={`relative px-3 before:absolute before:left-0 before:top-1/2 before:h-3.5 before:w-px before:-translate-y-1/2 before:bg-border ${item.className ?? ''}`}
          >
            {item.node}
          </span>
        ))}
      </p>
    </div>
  );
}
