/**
 * Login por provedor OAuth/OIDC (Google hoje). Um projeto liga assim:
 * - src/app/api/auth/oauth/[provider]/start/route.ts    → `export const GET = createOAuthStartHandler()`
 * - src/app/api/auth/oauth/[provider]/callback/route.ts → `export const GET = createOAuthCallbackHandler(pgrstRpc)`
 * - src/app/api/auth/providers/route.ts                 → `export const GET = createAuthProvidersHandler()`
 *
 * Depende da RPC `auth.fun_auth__external_login` (sql/0113_external_identities.sql).
 */

import { NextResponse } from 'next/server';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { resolveAppUrl, sanitizeReturnTo } from './app-url';
import { maskEmail, sessionCookieOptions, getDisplayNameFromEmail } from './auth';
import { getOAuthProvider, listEnabledOAuthProviders } from './oauth/providers';
import type { OAuthProfile } from './oauth/types';
import { isPhoneLoginEnabled } from './otp/registry';
import type { OtpConfig } from './otp/types';
import { issueSessionFromLoginResult, purposeAuthHeader } from './session-issue';

type PgrstRpc = (name: string, payload: any, opts?: any) => Promise<Response>;
type PgrstTable = (
  path: string,
  init?: RequestInit,
  opts?: { auth?: string | null }
) => Promise<Response>;
type RouteContext = { params: Promise<{ provider: string }> };

const FLOW_COOKIE = 'kizuna_oauth';
const FLOW_TTL_SEC = 600;
const LOGIN_PATH = '/login';

function jwtSecret(): string {
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
  return secret;
}

function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function callbackUrl(request: Request, providerId: string): string {
  return `${resolveAppUrl(request)}/api/auth/oauth/${providerId}/callback`;
}

type FlowState = { p: string; s: string; v: string; n: string; r: string };

function loginErrorRedirect(request: Request, code: string, returnTo?: string): Response {
  const url = new URL(LOGIN_PATH, resolveAppUrl(request));
  url.searchParams.set('erro', code);
  if (returnTo && returnTo !== '/') url.searchParams.set('returnTo', returnTo);
  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.set({ name: FLOW_COOKIE, value: '', path: '/api/auth/oauth', maxAge: 0 });
  return res;
}

/** `GET /api/auth/oauth/<provider>/start?returnTo=/algum/caminho` → redireciona ao provedor. */
export function createOAuthStartHandler() {
  return async function handleOAuthStart(request: Request, ctx: RouteContext): Promise<Response> {
    const { provider: providerId } = await ctx.params;
    const provider = getOAuthProvider(providerId);
    if (!provider) {
      return NextResponse.json({ message: 'Provedor de login indisponivel.' }, { status: 404 });
    }

    const returnTo = sanitizeReturnTo(new URL(request.url).searchParams.get('returnTo'));
    const flow: FlowState = {
      p: provider.id,
      s: randomToken(),
      v: randomToken(48),
      n: randomToken(),
      r: returnTo,
    };

    const location = provider.authorizeUrl({
      redirectUri: callbackUrl(request, provider.id),
      state: flow.s,
      codeChallenge: pkceChallenge(flow.v),
      nonce: flow.n,
    });

    const res = NextResponse.redirect(location, { status: 302 });
    // Assinado: impede que alguém plante um cookie com state/verifier escolhidos por ele.
    res.cookies.set({
      name: FLOW_COOKIE,
      value: jwt.sign(flow, jwtSecret(), { algorithm: 'HS256', expiresIn: FLOW_TTL_SEC }),
      httpOnly: true,
      // lax: o retorno do provedor é navegação top-level GET, o cookie vai junto.
      sameSite: 'lax',
      path: '/api/auth/oauth',
      maxAge: FLOW_TTL_SEC,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  };
}

/** Grava nome/foto do provedor no perfil (plugin user_data). Best-effort: nunca derruba o login. */
async function seedProfile(
  pgrstTable: PgrstTable | undefined,
  sessionToken: string,
  userId: string,
  profile: OAuthProfile
): Promise<void> {
  if (!pgrstTable) return;
  try {
    const res = await pgrstTable(
      '/user_data',
      {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          full_name: profile.name,
          avatar_url: profile.picture,
          email: profile.email,
          email_verified: profile.emailVerified,
        }),
      },
      { auth: `Bearer ${sessionToken}` }
    );
    if (!res.ok && res.status !== 409) {
      console.warn('[auth.oauth] profile_seed_failed', { status: res.status });
    }
  } catch (error) {
    console.warn('[auth.oauth] profile_seed_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** `GET /api/auth/oauth/<provider>/callback` — troca o code, cria/vincula a conta e abre sessão. */
export function createOAuthCallbackHandler(
  pgrstRpc: PgrstRpc,
  options: { pgrstTable?: PgrstTable } = {}
) {
  return async function handleOAuthCallback(
    request: Request,
    ctx: RouteContext
  ): Promise<Response> {
    const requestId = randomUUID();
    const { provider: providerId } = await ctx.params;
    const provider = getOAuthProvider(providerId);
    if (!provider) return loginErrorRedirect(request, 'provedor_indisponivel');

    const params = new URL(request.url).searchParams;
    const rawFlow = readCookie(request, FLOW_COOKIE);
    let flow: FlowState | null = null;
    try {
      flow = rawFlow ? (jwt.verify(rawFlow, jwtSecret()) as FlowState) : null;
    } catch {
      flow = null;
    }

    if (!flow || flow.p !== provider.id || !params.get('state') || params.get('state') !== flow.s) {
      console.warn('[auth.oauth] invalid_state', { requestId, provider: provider.id });
      return loginErrorRedirect(request, 'sessao_expirada');
    }

    // Usuário cancelou na tela do provedor, ou erro do provedor.
    if (params.get('error')) {
      return loginErrorRedirect(request, 'cancelado', flow.r);
    }

    const code = params.get('code');
    if (!code) return loginErrorRedirect(request, 'falha_provedor', flow.r);

    let profile: OAuthProfile;
    try {
      profile = await provider.exchange({
        code,
        redirectUri: callbackUrl(request, provider.id),
        codeVerifier: flow.v,
        nonce: flow.n,
      });
    } catch (error) {
      console.error('[auth.oauth] exchange_failed', {
        requestId,
        provider: provider.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return loginErrorRedirect(request, 'falha_provedor', flow.r);
    }

    try {
      const rpcRes = await pgrstRpc(
        'fun_auth__external_login',
        {
          p_provider: provider.id,
          p_subject: profile.subject,
          p_email: profile.email,
          p_email_verified: profile.emailVerified,
        },
        { auth: purposeAuthHeader('external_login'), schema: 'auth' }
      );
      const data = (await rpcRes.json().catch(() => null)) as Record<string, unknown> | null;

      if (!rpcRes.ok) {
        const message = String(data?.message ?? '');
        console.warn('[auth.oauth] rpc_failed', {
          requestId,
          provider: provider.id,
          email: profile.email ? maskEmail(profile.email) : null,
          status: rpcRes.status,
          message,
        });
        return loginErrorRedirect(
          request,
          message.includes('email_not_verified') ? 'email_nao_verificado' : 'falha_login',
          flow.r
        );
      }

      const displayName =
        profile.name?.trim() ||
        (profile.email ? getDisplayNameFromEmail(profile.email) : 'Usuario');
      const session = issueSessionFromLoginResult(data, { displayName });
      if (!session) {
        // NULL = conta bloqueada/desativada.
        return loginErrorRedirect(request, 'conta_bloqueada', flow.r);
      }
      const { token } = session;
      const userId = session.user.user_id;

      if (data?.created === true) {
        await seedProfile(options.pgrstTable, token, userId, profile);
      }

      console.info('[auth.oauth] success', {
        requestId,
        provider: provider.id,
        userId,
        created: data?.created === true,
        linked: data?.linked === true,
      });

      const res = NextResponse.redirect(new URL(flow.r, resolveAppUrl(request)), { status: 302 });
      res.cookies.set(sessionCookieOptions(token));
      res.cookies.set({ name: FLOW_COOKIE, value: '', path: '/api/auth/oauth', maxAge: 0 });
      return res;
    } catch (error) {
      console.error('[auth.oauth] unexpected_error', {
        requestId,
        provider: provider.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return loginErrorRedirect(request, 'falha_login', flow.r);
    }
  };
}

/**
 * `GET /api/auth/providers` → `{ providers: [{ id, label }], phone: boolean }` — só o que está
 * configurado (envs do OAuth; provedor OTP utilizável). A UI esconde o que não vier aqui.
 */
export function createAuthProvidersHandler(options: { otp?: OtpConfig } = {}) {
  return async function handleAuthProviders(): Promise<Response> {
    return NextResponse.json({
      providers: listEnabledOAuthProviders(),
      phone: isPhoneLoginEnabled(options.otp),
    });
  };
}
