import { kickerTone } from './news-highlights-format';

export type NewsTagsProps = {
  /** Grupo da notícia (ex.: "Notícias"): etiqueta neutra, só contexto. */
  group?: string | null;
  /** Categoria (ex.: "Esportes"): etiqueta colorida; a cor é a mesma em qualquer tela. */
  category: string;
  /** `md` no cabeçalho da matéria, `sm` nos cards. */
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * As duas etiquetas da notícia: grupo (neutra) + categoria (no matiz determinístico do texto).
 * Sem grupo, ou se o grupo repete a categoria, sobra só a categoria.
 */
export function NewsTags({ group, category, size = 'sm', className = '' }: NewsTagsProps) {
  const tone = kickerTone(category);
  const showGroup = !!group?.trim() && group.trim().toLowerCase() !== category.trim().toLowerCase();
  const pad = size === 'md' ? 'px-3 py-1 text-[0.8rem]' : 'px-2 py-[3px] text-[0.68rem]';
  return (
    <span className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {showGroup ? (
        <span
          className={`inline-flex items-center rounded-full border border-border bg-muted/60 font-semibold leading-none text-muted-foreground ${pad}`}
        >
          {group}
        </span>
      ) : null}
      <span
        className={`inline-flex min-w-0 items-center rounded-full font-semibold leading-none ${pad}`}
        style={{ color: tone.text, background: tone.wash }}
      >
        <span className="truncate">{category}</span>
      </span>
    </span>
  );
}
