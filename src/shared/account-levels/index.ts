/**
 * Níveis de conta progressivos ("entra fácil, evolui para fazer mais" — estilo iFood/Uber).
 *
 * Divisão de responsabilidades:
 *   - kizuna.config.json `accountLevels` → QUAIS níveis existem, títulos, descrições, ordem no
 *     onboarding e na página de dados, e qual requisito cada um usa. Só rótulo/ordem.
 *   - REQUIREMENTS (aqui, em código)     → o que cada requisito exige. Regra de segurança não mora
 *     em JSON editável.
 *   - capabilities do projeto            → ação → key do nível mínimo (ex.: src/lib/capabilities.ts).
 *
 * Nível do usuário = maior N em que TODOS os níveis 1..N estão cumpridos (sequencial). Visitante
 * (sem sessão) = 0, implícito.
 */

import { validateDocument } from '../../lib/validate-doc';

export const REQUIREMENT_IDS = [
  'authenticated',
  'contact_verified',
  'profile_complete',
  'listing_published',
  'identity_verified',
] as const;
export type RequirementId = (typeof REQUIREMENT_IDS)[number];

export type AccountLevelDef = {
  key: string;
  level: number;
  title: string;
  description?: string;
  onboardingOrder?: number;
  profileOrder?: number;
  requirement: RequirementId;
  /** false = porta para o futuro: aparece como "em breve" e ninguém alcança. Padrão true. */
  enabled?: boolean;
  /** Para onde o CTA "completar" leva. */
  href?: string;
};

/** Quais contatos o nível `contact_verified` exige. Padrão: os dois. */
export type ContactVerificationConfig = { email: boolean; phone: boolean };

/** Identificador estável de cada pendência — a UI e os links usam isto, nunca o texto. */
export type MissingKey =
  | 'login'
  | 'email'
  | 'phone'
  | 'fullName'
  | 'avatar'
  | 'document'
  | 'address'
  | 'listing'
  | 'listingPending'
  | 'identity'
  | 'comingSoon';

/** Uma pendência de nível: rótulo humano + para onde levar o usuário para resolvê-la. */
export type MissingItem = { key: MissingKey; label: string; href?: string };

/**
 * Para onde cada pendência leva (seções de /painel/minha-conta). O projeto sobrescreve por
 * `accountLevels.missingLinks` no kizuna.config.json. Sem link: a pendência aparece só como texto.
 */
export const DEFAULT_MISSING_LINKS: Partial<Record<MissingKey, string>> = {
  login: '/login',
  email: '/painel/minha-conta#contato',
  phone: '/painel/minha-conta#contato',
  fullName: '/painel/minha-conta#dados-pessoais',
  avatar: '/painel/minha-conta#foto',
  document: '/painel/minha-conta#dados-pessoais',
  address: '/painel/minha-conta#endereco',
  listing: '/painel/meus-servicos/novo',
  listingPending: '/painel/meus-servicos',
};

export type AccountLevelsConfig = {
  levels: AccountLevelDef[];
  contactVerification: ContactVerificationConfig;
  missingLinks: Partial<Record<MissingKey, string>>;
};

/** Fatos sobre a conta, lidos do banco (auth.fun_auth__account_facts) + config do projeto. */
export type AccountFacts = {
  authenticated: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  documentRequired: boolean;
  /** Anúncios do usuário (plugin services). Sem o plugin: zeros. */
  listings: { published: number; pending: number };
  profile: {
    fullName?: string | null;
    avatarUrl?: string | null;
    documentType?: string | null;
    documentNumber?: string | null;
    state?: string | null;
    city?: string | null;
    zipCode?: string | null;
  };
};

export const NO_LISTINGS: AccountFacts['listings'] = { published: 0, pending: 0 };

const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim().length > 0;

type Pending = Omit<MissingItem, 'href'>;
const item = (key: MissingKey, label: string): Pending => ({ key, label });

/** Requisitos: cada um devolve a lista do que falta (vazia = cumprido). */
export const REQUIREMENTS: Record<
  RequirementId,
  (facts: AccountFacts, config: Pick<AccountLevelsConfig, 'contactVerification'>) => Pending[]
> = {
  authenticated: (f) => (f.authenticated ? [] : [item('login', 'Entrar na conta')]),

  contact_verified: (f, { contactVerification }) => {
    const missing: Pending[] = [];
    if (contactVerification.email && !f.emailVerified) missing.push(item('email', 'Verificar email'));
    if (contactVerification.phone && !f.phoneVerified)
      missing.push(item('phone', 'Verificar celular'));
    return missing;
  },

  // Mesma regra do passo "Completar perfil" de user-data-form.tsx.
  profile_complete: (f) => {
    const p = f.profile;
    const missing: Pending[] = [];
    if (!filled(p.fullName)) missing.push(item('fullName', 'Nome completo'));
    if (!filled(p.avatarUrl)) missing.push(item('avatar', 'Foto de perfil'));
    if (f.documentRequired) {
      const type = p.documentType === 'cnpj' ? 'cnpj' : 'cpf';
      if (!filled(p.documentNumber) || !validateDocument(type, p.documentNumber ?? '')) {
        missing.push(item('document', 'CPF ou CNPJ valido'));
      }
    }
    if (!filled(p.zipCode) || !filled(p.state) || !filled(p.city))
      missing.push(item('address', 'Endereco (CEP, estado e cidade)'));
    return missing;
  },

  listing_published: (f) => {
    if (f.listings.published > 0) return [];
    return f.listings.pending > 0
      ? [item('listingPending', 'Anuncio em analise')]
      : [item('listing', 'Publicar seu primeiro anuncio')];
  },

  // Porta para verificação de identidade (documento + selfie com IA). Sem implementação na v1.
  identity_verified: (f) => (f.identityVerified ? [] : [item('identity', 'Verificar identidade')]),
};

/** Valida e normaliza o bloco `accountLevels`. Lança erro claro — config quebrada não pode passar calada. */
export function parseAccountLevelsConfig(raw: unknown): AccountLevelsConfig {
  const levels = (raw as { levels?: unknown })?.levels;
  if (!Array.isArray(levels) || levels.length === 0) {
    throw new Error('accountLevels.levels precisa ser uma lista com ao menos um nivel.');
  }
  const seenKeys = new Set<string>();
  const seenLevels = new Set<number>();
  const out = levels.map((item, i): AccountLevelDef => {
    const l = item as Partial<AccountLevelDef>;
    const where = `accountLevels.levels[${i}]`;
    if (typeof l.key !== 'string' || !/^[a-z][a-z0-9_-]*$/.test(l.key)) {
      throw new Error(`${where}.key invalida (use minusculas, ex.: "perfil").`);
    }
    if (!Number.isInteger(l.level) || (l.level as number) < 1) {
      throw new Error(`${where}.level precisa ser inteiro >= 1 (0 e o visitante, implicito).`);
    }
    if (typeof l.title !== 'string' || !l.title.trim())
      throw new Error(`${where}.title obrigatorio.`);
    if (!REQUIREMENT_IDS.includes(l.requirement as RequirementId)) {
      throw new Error(
        `${where}.requirement "${String(l.requirement)}" desconhecido. Use: ${REQUIREMENT_IDS.join(', ')}.`
      );
    }
    if (seenKeys.has(l.key)) throw new Error(`${where}.key "${l.key}" repetida.`);
    if (seenLevels.has(l.level as number)) throw new Error(`${where}.level ${l.level} repetido.`);
    seenKeys.add(l.key);
    seenLevels.add(l.level as number);
    return {
      key: l.key,
      level: l.level as number,
      title: l.title,
      description: l.description,
      onboardingOrder: l.onboardingOrder ?? (l.level as number),
      profileOrder: l.profileOrder ?? (l.level as number),
      requirement: l.requirement as RequirementId,
      enabled: l.enabled !== false,
      href: l.href,
    };
  });
  out.sort((a, b) => a.level - b.level);

  const cv = (raw as { contactVerification?: Partial<ContactVerificationConfig> })
    ?.contactVerification;
  const contactVerification = { email: cv?.email !== false, phone: cv?.phone !== false };

  const rawLinks = (raw as { missingLinks?: unknown })?.missingLinks;
  const missingLinks: Partial<Record<MissingKey, string>> = { ...DEFAULT_MISSING_LINKS };
  if (rawLinks && typeof rawLinks === 'object') {
    for (const [key, href] of Object.entries(rawLinks as Record<string, unknown>)) {
      if (key.startsWith('_')) continue;
      if (typeof href !== 'string') {
        throw new Error(`accountLevels.missingLinks.${key} precisa ser texto (URL).`);
      }
      missingLinks[key as MissingKey] = href;
    }
  }

  return { levels: out, contactVerification, missingLinks };
}

/**
 * Garante que todo nível citado no mapa de capacidades existe na config — roda quando o módulo do
 * projeto carrega, então uma key errada quebra o dev/build na hora, não em produção.
 */
export function defineCapabilities<T extends Record<string, string>>(
  config: AccountLevelsConfig,
  capabilities: T
): T {
  const keys = new Set(config.levels.map((l) => l.key));
  for (const [action, levelKey] of Object.entries(capabilities)) {
    if (!keys.has(levelKey)) {
      throw new Error(
        `Capacidade "${action}" aponta para o nivel "${levelKey}", que nao existe em accountLevels.`
      );
    }
  }
  return capabilities;
}

/** Rótulos das ações agrupados pelo nível que as libera — "o que você libera" no card. */
export function unlocksByLevel(
  capabilities: Record<string, string>,
  labels: Record<string, string> = {}
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [action, levelKey] of Object.entries(capabilities)) {
    const label = labels[action];
    if (!label) continue;
    const list = (out[levelKey] ??= []);
    if (!list.includes(label)) list.push(label);
  }
  return out;
}

export type LevelStatus = AccountLevelDef & {
  /** Requisito deste nível cumprido (isoladamente). */
  met: boolean;
  /** Alcançado: este e todos os anteriores cumpridos. */
  reached: boolean;
  missing: MissingItem[];
};

export type AccountStatus = {
  level: number;
  levelKey: string | null;
  levels: LevelStatus[];
  /** Próximo nível a conquistar (o primeiro não alcançado e habilitado), ou null. */
  next: LevelStatus | null;
  /** Contatos verificados de fato (independe de o nível exigir cada um). */
  contact: { emailVerified: boolean; phoneVerified: boolean };
};

export function computeAccountStatus(
  config: AccountLevelsConfig,
  facts: AccountFacts
): AccountStatus {
  let level = 0;
  let levelKey: string | null = null;
  // Sem sessão nada é alcançado, mesmo que a config não comece por `authenticated`.
  let chainIntact = facts.authenticated;

  const levels = config.levels.map((def): LevelStatus => {
    const pending =
      def.enabled === false
        ? [item('comingSoon', 'Em breve')]
        : REQUIREMENTS[def.requirement](facts, config);
    const missing = pending.map((m): MissingItem => {
      const href = config.missingLinks[m.key];
      return href ? { ...m, href } : m;
    });
    const met = def.enabled !== false && missing.length === 0;
    const reached = chainIntact && met;
    if (reached) {
      level = def.level;
      levelKey = def.key;
    } else {
      chainIntact = false;
    }
    return { ...def, met, reached, missing };
  });

  const next = levels.find((l) => !l.reached && l.enabled !== false) ?? null;
  return {
    level,
    levelKey,
    levels,
    next,
    contact: { emailVerified: facts.emailVerified, phoneVerified: facts.phoneVerified },
  };
}

export type CanResult = {
  allowed: boolean;
  action: string;
  /** Nível exigido pela ação (null = ação sem regra: só exige estar logado). */
  required: AccountLevelDef | null;
  /** Níveis que faltam, em ordem, até liberar a ação. */
  pending: LevelStatus[];
};

/**
 * Pode fazer `action`? Ação ausente do mapa = exige só estar logado (nível >= 1): fechar por
 * padrão sem travar ações ainda não classificadas.
 */
export function canDo(
  status: AccountStatus,
  capabilities: Record<string, string>,
  action: string
): CanResult {
  const requiredKey = capabilities[action];
  const required = requiredKey ? (status.levels.find((l) => l.key === requiredKey) ?? null) : null;
  const requiredLevel = required?.level ?? 1;
  const allowed = status.level >= requiredLevel && (required?.enabled ?? true) !== false;
  const pending = allowed
    ? []
    : status.levels.filter((l) => l.level <= requiredLevel && !l.reached);
  return { allowed, action, required, pending };
}
