/**
 * Parser de frontmatter — subconjunto pequeno de YAML, sem dependência.
 *
 * Aceita: `chave: valor` (texto simples ou entre aspas), listas com hífen, comentários com `#`.
 * NÃO aceita: objetos aninhados, multilinha (`|`, `>`), coleções inline (`[a]`, `{a: 1}`),
 * âncoras e aliases. Sintaxe fora do subconjunto lança `FrontmatterError` com a linha, em vez de
 * falhar em silêncio. Todo valor sai como string (ou lista de strings); quem tipa é a coleção.
 */

export type FrontmatterValue = string | string[];
export type ParsedDocument = { data: Record<string, FrontmatterValue>; body: string };

export class FrontmatterError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(`linha ${line}: ${message}`);
    this.name = 'FrontmatterError';
    this.line = line;
  }
}

const KEY_LINE = /^([A-Za-z_][A-Za-z0-9_]*):(?:[ \t]+(.*))?$/;
const LIST_ITEM = /^[ \t]*-[ \t]+(.*)$/;
/** Primeiro caractere que, em YAML, abre sintaxe que este parser não implementa. */
const UNSUPPORTED_START = '|>&*[{';

function afterClosingQuote(rest: string, line: number): void {
  const tail = rest.trim();
  if (tail !== '' && !tail.startsWith('#')) {
    throw new FrontmatterError('texto depois das aspas de fechamento', line);
  }
}

function parseDoubleQuoted(text: string, line: number): string {
  let out = '';
  for (let i = 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      const next = text[i + 1];
      if (next === undefined) break;
      if (next !== '\\' && next !== '"' && next !== 'n' && next !== 't') {
        throw new FrontmatterError(
          'escape "\\' + next + '" não suportado (use \\\\ para barra, \\" para aspas, \\n e \\t)',
          line
        );
      }
      out += next === 'n' ? '\n' : next === 't' ? '\t' : next;
      i++;
      continue;
    }
    if (ch === '"') {
      afterClosingQuote(text.slice(i + 1), line);
      return out;
    }
    out += ch;
  }
  throw new FrontmatterError('aspas duplas sem fechamento', line);
}

function parseSingleQuoted(text: string, line: number): string {
  let out = '';
  for (let i = 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'") {
      if (text[i + 1] === "'") {
        out += "'";
        i++;
        continue;
      }
      afterClosingQuote(text.slice(i + 1), line);
      return out;
    }
    out += ch;
  }
  throw new FrontmatterError('aspas simples sem fechamento', line);
}

function parseScalar(raw: string, line: number): string {
  const text = raw.trim();
  if (text === '') return '';
  if (text[0] === '#') return '';
  const first = text[0];
  if (first === '"') return parseDoubleQuoted(text, line);
  if (first === "'") return parseSingleQuoted(text, line);
  if (UNSUPPORTED_START.includes(first)) {
    throw new FrontmatterError(
      `sintaxe não suportada ("${first}"): use texto simples ou coloque o valor entre aspas`,
      line
    );
  }
  const comment = text.search(/[ \t]#/);
  return (comment === -1 ? text : text.slice(0, comment)).trim();
}

export function parseFrontmatter(source: string): ParsedDocument {
  const text = source.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  if (lines[0].trimEnd() !== '---') return { data: {}, body: text };

  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trimEnd() === '---') {
      close = i;
      break;
    }
  }
  if (close === -1) {
    throw new FrontmatterError('frontmatter sem a linha "---" de fechamento', 1);
  }

  // Sem protótipo: uma chave `__proto__` ou `constructor` vira dado, nunca toca o Object.
  const data = Object.create(null) as Record<string, FrontmatterValue>;
  let listKey: string | null = null;

  for (let i = 1; i < close; i++) {
    const lineNo = i + 1;
    const line = lines[i];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;

    const item = LIST_ITEM.exec(line);
    if (item) {
      if (listKey === null) {
        throw new FrontmatterError('item de lista sem uma chave vazia logo antes', lineNo);
      }
      const current = data[listKey];
      const list = Array.isArray(current) ? current : [];
      list.push(parseScalar(item[1], lineNo));
      data[listKey] = list;
      continue;
    }

    if (/^[ \t]/.test(line)) {
      throw new FrontmatterError('recuo não suportado (objetos aninhados não são aceitos)', lineNo);
    }

    const kv = KEY_LINE.exec(line);
    if (!kv) {
      throw new FrontmatterError(`não entendi "${line.trim()}": esperava "chave: valor"`, lineNo);
    }
    const key = kv[1];
    const rawValue = kv[2] ?? '';
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      throw new FrontmatterError(`chave "${key}" repetida`, lineNo);
    }
    data[key] = parseScalar(rawValue, lineNo);
    // Abre lista só quando não há valor (vazio ou só comentário); `""` explícito não abre lista.
    const bare = rawValue.trim();
    listKey = bare === '' || bare.startsWith('#') ? key : null;
  }

  const body = lines.slice(close + 1).join('\n').replace(/^\n+/, '');
  return { data, body };
}
