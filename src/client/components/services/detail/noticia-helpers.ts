/**
 * Helpers puros da variant `noticia` (sem JSX): leem o anúncio + respostas do formulário e devolvem
 * o que a página de artigo desenha (chapéu, data, autor, fontes, crédito da foto, tempo de leitura).
 *
 * Convenção de dados (genérica, documentada em `docs/plugins/services.md`):
 * - formulário da categoria: `data_publicacao` (AAAA-MM-DDTHH:MM, relógio local), `autor`, `fonte`,
 *   `link` (URL da fonte);
 * - `extras.fontes`: `[{ nome, url? }]`, principal primeiro — tem precedência sobre `fonte`/`link`;
 * - `extras.imagem_credito`: `{ autor, licenca, licenca_url, pagina_origem, alt, legenda }`.
 */
import { stripHtml } from '../../../../lib/helper/text.helper';
import { NEWS_DEFAULT_TIME_ZONE, parseNewsDate } from '../../home/news-highlights-format';
import { safeHttpUrl } from './evento-helpers';
import type { ServiceRecord } from '../service-type';
import type { ServiceExtraFields } from '../../../../server/services/service-detail-data';

export type NewsSource = { name: string; url: string | null };

export type NewsPhotoCredit = {
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  /** Página de origem da foto (Wikimedia, Flickr, site do órgão...). */
  sourceUrl: string | null;
  alt: string | null;
  caption: string | null;
};

export type NewsArticleMeta = {
  /** Chapéu: 1ª subcategoria > categoria > grupo > "Notícias". */
  kicker: string;
  /** Instante de publicação (`data_publicacao`, senão `createdAt`); `null` sem data válida. */
  publishedAt: Date | null;
  /** Data por extenso ("25 de outubro de 2026, 8h"); `null` sem data. */
  publishedLabel: string | null;
  author: string | null;
  /** Fontes, principal primeiro (`extras.fontes`, senão `fonte` + `link`). */
  sources: NewsSource[];
  /** Atalhos da fonte principal. */
  source: string | null;
  sourceUrl: string | null;
  photoCredit: NewsPhotoCredit | null;
  /** Minutos de leitura do corpo (200 palavras/min, mínimo 1); `null` sem texto. */
  readingMinutes: number | null;
};

function str(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const s = String(value).trim();
  return s ? s : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** "25 de outubro de 2026, 8h" / "…, 8h30", no relógio de `timeZone`. */
export function formatNewsPublished(date: Date, timeZone: string = NEWS_DEFAULT_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = String(Number(get('hour')));
  const minute = get('minute');
  const time = minute === '00' ? `${hour}h` : `${hour}h${minute}`;
  return `${get('day')} de ${get('month')} de ${get('year')}, ${time}`;
}

/** Minutos de leitura (200 palavras/min), arredondado pra cima; `null` sem texto. */
export function readingMinutes(text: string | null | undefined, wordsPerMinute = 200): number | null {
  const words = stripHtml(text ?? '')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  if (words === 0) return null;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/** `extras.fontes` (`[{ nome, url? }]` ou strings) → fontes válidas; URL só http(s). */
export function newsSources(
  extras: Record<string, unknown> | null | undefined,
  answers?: Record<string, unknown> | null
): NewsSource[] {
  const list = Array.isArray(extras?.fontes) ? (extras.fontes as unknown[]) : [];
  const fromExtras = list
    .map((item): NewsSource | null => {
      if (typeof item === 'string') {
        const name = str(item);
        return name ? { name, url: null } : null;
      }
      const row = record(item);
      const name = str(row?.nome);
      return name ? { name, url: safeHttpUrl(row?.url) } : null;
    })
    .filter((s): s is NewsSource => s !== null);
  if (fromExtras.length > 0) return fromExtras;

  const name = str(answers?.fonte);
  const url = safeHttpUrl(answers?.link);
  if (name) return [{ name, url }];
  // Só o link: o nome vira o domínio ("g1.globo.com").
  if (url) return [{ name: new URL(url).hostname.replace(/^www\./, ''), url }];
  return [];
}

/** `extras.imagem_credito` → crédito da foto; `null` sem nada aproveitável. */
export function newsPhotoCredit(extras: Record<string, unknown> | null | undefined): NewsPhotoCredit | null {
  const raw = record(extras?.imagem_credito);
  if (!raw) return null;
  const credit: NewsPhotoCredit = {
    author: str(raw.autor),
    license: str(raw.licenca),
    licenseUrl: safeHttpUrl(raw.licenca_url),
    sourceUrl: safeHttpUrl(raw.pagina_origem),
    alt: str(raw.alt),
    caption: str(raw.legenda),
  };
  return Object.values(credit).some((v) => v !== null) ? credit : null;
}

/** Tudo que a página de artigo precisa, a partir do anúncio e das respostas do formulário. */
export function newsArticleMeta(
  service: Pick<ServiceRecord, 'description' | 'extras' | 'createdAt' | 'category' | 'categoryGroup'>,
  extraFields: ServiceExtraFields,
  options: { subcategoryNames?: string[]; timeZone?: string } = {}
): NewsArticleMeta {
  const timeZone = options.timeZone ?? NEWS_DEFAULT_TIME_ZONE;
  const answers = extraFields?.answers ?? {};
  const extras = service.extras ?? {};

  const kicker =
    options.subcategoryNames?.map((n) => n.trim()).find(Boolean) ||
    str(service.category?.name) ||
    str(service.categoryGroup?.name) ||
    'Notícias';

  const publishedAt =
    parseNewsDate(str(answers.data_publicacao), timeZone) ?? parseNewsDate(service.createdAt ?? null, timeZone);
  const sources = newsSources(extras, answers);

  return {
    kicker,
    publishedAt,
    publishedLabel: publishedAt ? formatNewsPublished(publishedAt, timeZone) : null,
    author: str(answers.autor),
    sources,
    source: sources[0]?.name ?? null,
    sourceUrl: sources[0]?.url ?? null,
    photoCredit: newsPhotoCredit(extras),
    readingMinutes: readingMinutes(service.description),
  };
}
