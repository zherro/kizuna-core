/**
 * Vocabulário do projeto: como o app chama o "item" que o usuário cria e gerencia
 * ("Publicação", "Serviço", "Anúncio"...). Só texto — rotas (`/painel/meus-servicos`), schema
 * (`services`) e nomes de código não mudam.
 *
 * Modelo: um PRESET (contexto) + overrides. O bloco `vocabulary` do `kizuna.config.json` escolhe o
 * `context`, pode trocar o termo (`terms.item`, sempre com `gender`) e sobrescrever qualquer frase
 * pronta (`phrases`). As frases comuns (Novo/Nova, Nenhum/Nenhuma, cadastrado/cadastrada) saem do
 * gênero do termo — ver `derivePhrases`. Sem config vale `DEFAULT_VOCABULARY_CONTEXT`.
 *
 * Mesmo padrão do `shared/account-levels`: parser puro aqui; o projeto lê o JSON, valida e registra
 * (`src/lib/vocabulary.ts`). Telas (dado puro) referenciam frases por `"$vocab.<chave>"`, resolvido
 * em `screen-engine/context.ts`; componentes React leem `getVocabulary()`.
 */

export type Gender = 'm' | 'f';

export type Term = { singular: string; plural: string; gender: Gender };

const PHRASE_KEYS = [
  'singular',
  'plural',
  'new',
  'manage',
  'manageDescription',
  'yours',
  'mine',
  'createFirst',
  'noneRegistered',
  'registerFirstHint',
  'noneFound',
  'reviewTitle',
  'reviewDescription',
] as const;

export type PhraseKey = (typeof PHRASE_KEYS)[number];
export type Phrases = Record<PhraseKey, string>;

export type Vocabulary = { context: string; item: Term; phrases: Phrases };

export type VocabularyConfig = {
  context?: string;
  terms?: { item?: Partial<Term> };
  phrases?: Partial<Phrases>;
};

/** Contexto que vale quando o projeto não declara `vocabulary`. */
export const DEFAULT_VOCABULARY_CONTEXT = 'publicacao';

const PRESETS: Record<string, Term> = {
  publicacao: { singular: 'Publicação', plural: 'Publicações', gender: 'f' },
  servico: { singular: 'Serviço', plural: 'Serviços', gender: 'm' },
};

/** [masculino, feminino] — o plural é o singular + "s". */
const FORMS = {
  o: ['o', 'a'],
  novo: ['novo', 'nova'],
  nenhum: ['nenhum', 'nenhuma'],
  meu: ['meu', 'minha'],
  seu: ['seu', 'sua'],
  primeiro: ['primeiro', 'primeira'],
  cadastrado: ['cadastrado', 'cadastrada'],
  encontrado: ['encontrado', 'encontrada'],
} as const satisfies Record<string, readonly [string, string]>;

function form(word: keyof typeof FORMS, gender: Gender, plural = false): string {
  const base = FORMS[word][gender === 'm' ? 0 : 1];
  return plural ? `${base}s` : base;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function derivePhrases(item: Term): Phrases {
  const { gender } = item;
  const one = item.singular.toLowerCase();
  const many = item.plural.toLowerCase();
  return {
    singular: item.singular,
    plural: item.plural,
    new: `${capitalize(form('novo', gender))} ${one}`,
    manage: `Gerenciar ${many}`,
    manageDescription: `Crie ${many} em etapas e continue a edição quando precisar.`,
    yours: `${capitalize(form('seu', gender, true))} ${many}`,
    mine: `${capitalize(form('meu', gender, true))} ${many}`,
    createFirst: `Criar ${form('primeiro', gender)} ${one}`,
    noneRegistered: `${capitalize(form('nenhum', gender))} ${one} ${form('cadastrado', gender)} ainda.`,
    registerFirstHint: `Cadastre ${form('seu', gender)} ${form('primeiro', gender)} ${one} para começar.`,
    noneFound: `${capitalize(form('nenhum', gender))} ${one} ${form('encontrado', gender)}`,
    reviewTitle: `Revisão de ${many}`,
    reviewDescription: `Acompanhe ${form('o', gender, true)} ${many} e inicie uma revisão para aprovar, pausar ou arquivar.`,
  };
}

function fail(path: string, problem: string): never {
  throw new Error(`Config inválida em ${path}: ${problem}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'esperado texto não vazio.');
  return value.trim();
}

/** Monta o vocabulário a partir de uma config já validada (ver `parseVocabularyConfig`). */
export function buildVocabulary(config: VocabularyConfig = {}): Vocabulary {
  const context = config.context ?? DEFAULT_VOCABULARY_CONTEXT;
  const preset = PRESETS[context];
  const item: Term = { ...preset, ...config.terms?.item };
  return { context, item, phrases: { ...derivePhrases(item), ...config.phrases } };
}

/**
 * Valida o bloco `vocabulary` do `kizuna.config.json` (config inválida quebra o boot com erro
 * claro) e devolve o vocabulário pronto. `undefined` = contexto padrão.
 */
export function parseVocabularyConfig(raw: unknown): Vocabulary {
  if (raw === undefined || raw === null) return buildVocabulary();
  if (!isRecord(raw)) fail('vocabulary', 'esperado um objeto.');

  const config: VocabularyConfig = {};

  if (raw.context !== undefined) {
    const context = nonEmptyString(raw.context, 'vocabulary.context');
    if (!(context in PRESETS)) {
      fail('vocabulary.context', `"${context}" não existe. Use: ${Object.keys(PRESETS).join(', ')}.`);
    }
    config.context = context;
  }

  if (raw.terms !== undefined) {
    if (!isRecord(raw.terms)) fail('vocabulary.terms', 'esperado um objeto.');
    for (const key of Object.keys(raw.terms)) {
      if (key !== 'item') fail('vocabulary.terms', `termo "${key}" não existe. Use: item.`);
    }
    if (raw.terms.item !== undefined) {
      const rawItem = raw.terms.item;
      if (!isRecord(rawItem)) fail('vocabulary.terms.item', 'esperado um objeto.');
      const item: Partial<Term> = {};
      if (rawItem.singular !== undefined) {
        item.singular = nonEmptyString(rawItem.singular, 'vocabulary.terms.item.singular');
      }
      if (rawItem.plural !== undefined) {
        item.plural = nonEmptyString(rawItem.plural, 'vocabulary.terms.item.plural');
      }
      if (rawItem.gender !== undefined) {
        if (rawItem.gender !== 'm' && rawItem.gender !== 'f') {
          fail('vocabulary.terms.item.gender', 'use "m" ou "f".');
        }
        item.gender = rawItem.gender;
      }
      if ((item.singular || item.plural) && !item.gender) {
        fail(
          'vocabulary.terms.item.gender',
          'ao trocar o termo informe o gênero ("m" ou "f"): as frases dependem dele.'
        );
      }
      config.terms = { item };
    }
  }

  if (raw.phrases !== undefined) {
    if (!isRecord(raw.phrases)) fail('vocabulary.phrases', 'esperado um objeto.');
    const phrases: Partial<Phrases> = {};
    for (const [key, value] of Object.entries(raw.phrases)) {
      if (!(PHRASE_KEYS as readonly string[]).includes(key)) {
        fail('vocabulary.phrases', `frase "${key}" não existe. Use: ${PHRASE_KEYS.join(', ')}.`);
      }
      phrases[key as PhraseKey] = nonEmptyString(value, `vocabulary.phrases.${key}`);
    }
    config.phrases = phrases;
  }

  return buildVocabulary(config);
}

const REGISTRY_KEY = Symbol.for('kizuna.vocabulary');
type Registry = { [REGISTRY_KEY]?: Vocabulary };

// globalThis (e não uma variável do módulo): o mesmo processo carrega este arquivo em mais de uma
// camada do bundler (RSC, SSR, cliente) e todas precisam enxergar o mesmo vocabulário registrado.
export function setVocabulary(vocabulary: Vocabulary): void {
  (globalThis as Registry)[REGISTRY_KEY] = vocabulary;
}

export function resetVocabulary(): void {
  delete (globalThis as Registry)[REGISTRY_KEY];
}

export function getVocabulary(): Vocabulary {
  return (globalThis as Registry)[REGISTRY_KEY] ?? buildVocabulary();
}

/** `"$vocab.new"` → "Nova publicação". Chave desconhecida → `undefined` (a prop não é setada). */
export function resolveVocabRef(key: string): string | undefined {
  return (getVocabulary().phrases as Record<string, string | undefined>)[key];
}
