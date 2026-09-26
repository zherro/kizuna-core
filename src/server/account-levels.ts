/**
 * Níveis de conta no servidor. Um projeto liga assim (ver starter src/lib/account-levels.ts):
 * - src/app/api/account/level/route.ts → `export const GET = createAccountLevelHandler({ config, capabilities, ... })`
 * - páginas/rotas protegidas           → `await canDoServer({ config, capabilities }, 'service.create')`
 *
 * O nível é calculado a cada consulta a partir do banco (auth.fun_auth__account_facts, 0115) —
 * não fica congelado no JWT, então sobe na hora em que o usuário verifica o celular ou completa
 * o perfil, sem precisar relogar.
 */

import { NextResponse } from 'next/server';
import {
  canDo,
  computeAccountStatus,
  type AccountFacts,
  type AccountLevelsConfig,
  type AccountStatus,
  type CanResult,
} from '../shared/account-levels';
import { getAuthHeaderFromCookies } from './auth';
import { pgrstRpc } from './postrest/conn';

export type AccountLevelsSetup = {
  config: AccountLevelsConfig;
  capabilities: Record<string, string>;
  /** Documento (CPF/CNPJ) é obrigatório para "perfil completo"? Padrão: true. */
  documentRequired?: () => Promise<boolean> | boolean;
};

const ANONYMOUS: AccountFacts = {
  authenticated: false,
  emailVerified: false,
  phoneVerified: false,
  identityVerified: false,
  documentRequired: true,
  profile: {},
};

/** Lê os fatos da conta da sessão atual. Sem sessão ou com erro → visitante (fecha, não abre). */
export async function getAccountFacts(documentRequired = true): Promise<AccountFacts> {
  const auth = await getAuthHeaderFromCookies();
  if (!auth) return { ...ANONYMOUS, documentRequired };

  try {
    const res = await pgrstRpc('fun_auth__account_facts', {}, { auth, schema: 'auth' });
    if (!res.ok) {
      console.warn('[account-levels] facts_failed', { status: res.status });
      return { ...ANONYMOUS, documentRequired };
    }
    const data = (await res.json().catch(() => null)) as Record<string, any> | null;
    if (!data?.authenticated) return { ...ANONYMOUS, documentRequired };
    const p = (data.profile ?? {}) as Record<string, string | null>;
    return {
      authenticated: true,
      emailVerified: data.email_verified === true,
      phoneVerified: data.phone_verified === true,
      identityVerified: data.identity_verified === true,
      documentRequired,
      profile: {
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        documentType: p.document_type,
        documentNumber: p.document_number,
        state: p.state,
        city: p.city,
        zipCode: p.zip_code,
      },
    };
  } catch (error) {
    console.warn('[account-levels] facts_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...ANONYMOUS, documentRequired };
  }
}

export async function getAccountStatus(setup: AccountLevelsSetup): Promise<AccountStatus> {
  const documentRequired = setup.documentRequired ? await setup.documentRequired() : true;
  return computeAccountStatus(setup.config, await getAccountFacts(documentRequired));
}

/** Checagem de servidor — é esta que vale como barreira (o client só melhora a UX). */
export async function canDoServer(setup: AccountLevelsSetup, action: string): Promise<CanResult> {
  return canDo(await getAccountStatus(setup), setup.capabilities, action);
}

/**
 * `GET /api/account/level`            → `{ status, allowed: { [acao]: boolean } }`
 * `GET /api/account/level?action=x`   → idem + `can: CanResult`
 */
export function createAccountLevelHandler(setup: AccountLevelsSetup) {
  return async function handleAccountLevel(request: Request): Promise<Response> {
    const status = await getAccountStatus(setup);
    const allowed = Object.fromEntries(
      Object.keys(setup.capabilities).map((a) => [a, canDo(status, setup.capabilities, a).allowed])
    );
    const action = new URL(request.url).searchParams.get('action');
    const can = action ? canDo(status, setup.capabilities, action) : undefined;
    return NextResponse.json(
      { status, allowed, ...(can ? { can } : {}) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  };
}
