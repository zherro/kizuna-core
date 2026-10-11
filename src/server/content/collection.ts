import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter, type FrontmatterValue } from './frontmatter';
import type {
  CollectionDef,
  Entry,
  EntryData,
  EntryError,
  FieldDef,
  LoadOptions,
  LoadResult,
} from './types';

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const has = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export function isValidSlug(slug: string): boolean {
  return SLUG.test(slug);
}

/** Valida a definição em tempo de carga: erro de definição é erro do desenvolvedor, não do conteúdo. */
export function defineCollection(def: CollectionDef): CollectionDef {
  const gate = has(def.fields, def.publishWhen.field) ? def.fields[def.publishWhen.field] : undefined;
  if (!gate || gate.type !== 'enum') {
    throw new Error(
      `coleção "${def.name}": publishWhen.field "${def.publishWhen.field}" precisa ser um campo enum`
    );
  }
  if (!gate.values.includes(def.publishWhen.equals)) {
    throw new Error(
      `coleção "${def.name}": publishWhen.equals "${def.publishWhen.equals}" não está nos values do campo`
    );
  }
  return def;
}

function isRealDate(text: string): boolean {
  const m = DATE.exec(text);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function isHttpUrl(text: string): boolean {
  try {
    const u = new URL(text);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function checkField(key: string, def: FieldDef, value: FrontmatterValue, errors: string[]): EntryData[string] {
  const isList = Array.isArray(value);
  switch (def.type) {
    case 'string': {
      if (isList) return void errors.push(`"${key}" deve ser um texto, não uma lista`);
      if (def.max !== undefined && value.length > def.max) {
        errors.push(`"${key}" tem ${value.length} caracteres; o máximo é ${def.max}`);
        return undefined;
      }
      if (def.url && !isHttpUrl(value)) {
        errors.push(`"${key}" deve ser um endereço http ou https`);
        return undefined;
      }
      return value;
    }
    case 'number': {
      if (isList) return void errors.push(`"${key}" deve ser um número, não uma lista`);
      if (value.includes(',')) {
        errors.push(`"${key}" usa vírgula decimal: escreva com ponto (ex.: -15.601)`);
        return undefined;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return void errors.push(`"${key}" não é um número (recebi "${value}")`);
      if (def.min !== undefined && n < def.min) {
        errors.push(`"${key}" precisa ser no mínimo ${def.min}`);
        return undefined;
      }
      if (def.max !== undefined && n > def.max) {
        errors.push(`"${key}" precisa ser no máximo ${def.max}`);
        return undefined;
      }
      return n;
    }
    case 'date': {
      if (isList || !isRealDate(value)) return void errors.push(`"${key}" deve ser uma data AAAA-MM-DD`);
      return value;
    }
    case 'enum': {
      if (isList || !def.values.includes(value)) {
        errors.push(`"${key}" deve ser um de: ${def.values.join(', ')} (recebi "${isList ? '[lista]' : value}")`);
        return undefined;
      }
      return value;
    }
    case 'list': {
      if (!isList) return void errors.push(`"${key}" deve ser uma lista (um item por linha, com hífen)`);
      return value;
    }
  }
}

function validateData(
  raw: Record<string, FrontmatterValue>,
  fields: Record<string, FieldDef>
): { data: EntryData; errors: string[] } {
  const errors: string[] = [];
  const data: EntryData = {};

  for (const key of Object.keys(raw)) {
    if (!has(fields, key)) errors.push(`campo desconhecido "${key}"`);
  }

  for (const [key, def] of Object.entries(fields)) {
    const value = raw[key];
    const empty = value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (def.required) errors.push(`campo obrigatório ausente: "${key}"`);
      continue;
    }
    const checked = checkField(key, def, value, errors);
    if (checked !== undefined) data[key] = checked;
  }

  return { data, errors };
}

function listMedia(def: CollectionDef, slug: string, root: string): string[] {
  let names: string[];
  try {
    names = fs.readdirSync(path.join(/* turbopackIgnore: true */ root, def.mediaDir, slug));
  } catch {
    return [];
  }
  const prefix = def.mediaUrl.replace(/\/$/, '');
  return names
    .filter((n) => IMAGE_EXTENSIONS.has(path.extname(n).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((n) => `${prefix}/${slug}/${encodeURIComponent(n)}`);
}

type ReadResult = { entry: Entry } | { error: EntryError; missing?: boolean };

/**
 * Raiz do conteúdo. A diretiva `turbopackIgnore` impede o tracing do Next de tratar o cwd (com
 * segmentos dinâmicos) como "o projeto inteiro" e copiar tudo para o bundle standalone da rota.
 * O conteúdo é copiado para a imagem à parte (ver Dockerfile).
 */
function resolveRoot(options: LoadOptions): string {
  return options.root ?? /* turbopackIgnore: true */ process.cwd();
}

function readEntry(def: CollectionDef, slug: string, root: string): ReadResult {
  const file = path.join(/* turbopackIgnore: true */ root, def.contentDir, slug, 'index.md');
  let source: string;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return { error: { slug, file, message: 'index.md não encontrado' }, missing: true };
    return { error: { slug, file, message: `não foi possível ler index.md: ${code ?? 'erro desconhecido'}` } };
  }

  let parsed;
  try {
    parsed = parseFrontmatter(source);
  } catch (e) {
    return { error: { slug, file, message: (e as Error).message } };
  }

  const { data, errors } = validateData(parsed.data, def.fields);
  if (errors.length === 0 && def.validate) {
    const message = def.validate(data);
    if (message) errors.push(message);
  }
  if (errors.length > 0) return { error: { slug, file, message: errors.join('; ') } };

  return { entry: { slug, data, body: parsed.body, media: listMedia(def, slug, root) } };
}

const isPublishable = (def: CollectionDef, entry: Entry) =>
  entry.data[def.publishWhen.field] === def.publishWhen.equals;

/** Lê a coleção inteira. `entries` só traz as publicáveis; `errors` traz as inválidas (com arquivo e motivo). */
export function loadEntries(def: CollectionDef, options: LoadOptions = {}): LoadResult {
  const root = resolveRoot(options);
  const base = path.join(/* turbopackIgnore: true */ root, def.contentDir);

  let dirs: fs.Dirent[];
  try {
    dirs = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return { entries: [], errors: [] };
  }

  const entries: Entry[] = [];
  const errors: EntryError[] = [];

  for (const dirent of dirs) {
    if (!dirent.isDirectory()) continue;
    const slug = dirent.name;
    if (slug.startsWith('_') || slug.startsWith('.')) continue;
    if (!isValidSlug(slug)) {
      errors.push({
        slug,
        file: path.join(/* turbopackIgnore: true */ base, slug),
        message: 'nome de pasta inválido: use a-z, 0-9 e hífen',
      });
      continue;
    }
    const result = readEntry(def, slug, root);
    if ('error' in result) errors.push(result.error);
    else if (isPublishable(def, result.entry)) entries.push(result.entry);
  }

  entries.sort((a, b) => a.slug.localeCompare(b.slug));
  return { entries, errors };
}

/** Uma entrada publicada, ou `null` (inexistente, inválida, não publicada ou slug fora do formato). */
export function getEntry(def: CollectionDef, slug: string, options: LoadOptions = {}): Entry | null {
  if (!isValidSlug(slug)) return null;
  const result = readEntry(def, slug, resolveRoot(options));
  if ('error' in result) {
    if (!result.missing) {
      console.warn(`[content] ${def.name}/${slug}: ${result.error.message}`);
    }
    return null;
  }
  return isPublishable(def, result.entry) ? result.entry : null;
}
