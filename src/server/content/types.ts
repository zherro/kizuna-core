/** Definição de um campo do frontmatter. O `type` decide como o texto cru é validado e convertido. */
export type FieldDef =
  | { type: 'string'; required?: boolean; max?: number; url?: boolean }
  | { type: 'number'; required?: boolean; min?: number; max?: number }
  | { type: 'date'; required?: boolean }
  | { type: 'enum'; values: readonly string[]; required?: boolean }
  | { type: 'list'; required?: boolean };

export type FieldValue = string | number | string[];
export type EntryData = Record<string, FieldValue | undefined>;

export type CollectionDef = {
  /** Nome da coleção (só para mensagens de erro). */
  name: string;
  /** Pasta com uma subpasta por entrada, cada uma com `index.md`. Relativa à raiz do projeto. */
  contentDir: string;
  /** Pasta com uma subpasta de mesmo slug contendo as fotos. Relativa à raiz do projeto. */
  mediaDir: string;
  /** Prefixo público das fotos, ex.: `/lugares` (a pasta fica em `public/lugares`). */
  mediaUrl: string;
  fields: Record<string, FieldDef>;
  /** A entrada só aparece quando `data[field] === equals`. O campo precisa ser `enum`. */
  publishWhen: { field: string; equals: string };
  /** Regra entre campos. Devolve a mensagem de erro, ou `null` quando está tudo certo. */
  validate?: (data: EntryData) => string | null;
};

export type Entry = {
  slug: string;
  data: EntryData;
  /** Markdown sem o frontmatter. */
  body: string;
  /** URLs públicas das fotos, em ordem natural de nome. */
  media: string[];
};

export type EntryError = { slug: string; file: string; message: string };
export type LoadResult = { entries: Entry[]; errors: EntryError[] };
export type LoadOptions = { root?: string };
