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

export type AccountLevelsConfig = { levels: AccountLevelDef[] };

/** Fatos sobre a conta, lidos do banco (auth.fun_auth__account_facts) + config do projeto. */
export type AccountFacts = {
  authenticated: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  documentRequired: boolean;
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

const filled = (v: string | null | undefined) => typeof v === 'string' && v.trim().length > 0;

/** Requisitos: cada um devolve a lista do que falta (vazia = cumprido). */
export const REQUIREMENTS: Record<RequirementId, (facts: AccountFacts) => string[]> = {
  authenticated: (f) => (f.authenticated ? [] : ['Entrar na conta']),

  contact_verified: (f) =>
    f.emailVerified || f.phoneVerified ? [] : ['Verificar email ou celular'],

  // Mesma regra do passo "Completar perfil" de user-data-form.tsx.
  profile_complete: (f) => {
    const p = f.profile;
    const missing: string[] = [];
    if (!filled(p.fullName)) missing.push('Nome completo');
    if (!filled(p.avatarUrl)) missing.push('Foto de perfil');
    if (f.documentRequired) {
      const type = p.documentType === 'cnpj' ? 'cnpj' : 'cpf';
      if (!filled(p.documentNumber) || !validateDocument(type, p.documentNumber ?? '')) {
        missing.push('CPF ou CNPJ valido');
      }
    }
    if (!filled(p.zipCode) || !filled(p.state) || !filled(p.city))
      missing.push('Endereco (CEP, estado e cidade)');
    return missing;
  },

  // Porta para verificação de identidade (documento + selfie com IA). Sem implementação na v1.
  identity_verified: (f) => (f.identityVerified ? [] : ['Verificar identidade']),
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
  return { levels: out };
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

export type LevelStatus = AccountLevelDef & {
  /** Requisito deste nível cumprido (isoladamente). */
  met: boolean;
  /** Alcançado: este e todos os anteriores cumpridos. */
  reached: boolean;
  missing: string[];
};

export type AccountStatus = {
  level: number;
  levelKey: string | null;
  levels: LevelStatus[];
  /** Próximo nível a conquistar (o primeiro não alcançado e habilitado), ou null. */
  next: LevelStatus | null;
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
    const missing = def.enabled === false ? ['Em breve'] : REQUIREMENTS[def.requirement](facts);
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
  return { level, levelKey, levels, next };
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
