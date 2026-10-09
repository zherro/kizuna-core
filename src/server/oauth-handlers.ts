/**
 * Login por provedor OAuth/OIDC (Google hoje). Um projeto liga assim:
 * - src/app/api/auth/oauth/[provider]/start/route.ts    → `export const GET = createOAuthStartHandler()`
 * - src/app/api/auth/oauth/[provider]/callback/route.ts → `export const GET = createOAuthCallbackHandler(pgrstRpc)`
 * - src/app/api/auth/oauth/[provider]/onetap/route.ts   → `export const { GET, POST } = createOAuthOneTapHandlers(pgrstRpc)`
 * - src/app/api/auth/providers/route.ts                 → `export const GET = createAuthProvidersHandler()`
 *
 * O botão abre o `start` numa janela popup (`?popup=1`): o callback então responde uma página que
 * avisa a aba de origem (BroadcastChannel/postMessage) e se fecha. Sem popup, é redirect normal.
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
import { safeReportAccountRecreation } from './account/report-recreation';

type PgrstRpc = (name: string, payload: any, opts?: any) => Promise<Response>;
type PgrstTable = (
  path: string,
  init?: RequestInit,
  opts?: { auth?: string | null }
) => Promise<Response>;
type RouteContext = { params: Promise<{ provider: string }> };

const FLOW_COOKIE = 'kizuna_oauth';
const ONETAP_COOKIE = 'kizuna_onetap';
const FLOW_TTL_SEC = 600;
const LOGIN_PATH = '/login';
/** Canal/tipo da mensagem que a janela popup manda para a aba que abriu o login. */
const POPUP_MESSAGE = 'kizuna:oauth';

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

/** `m: 'popup'` = o fluxo roda numa janela popup e termina avisando a aba de origem. */
type FlowState = { p: string; s: string; v: string; n: string; r: string; m?: 'popup' };

function clearCookie(res: NextResponse, name: string): NextResponse {
  res.cookies.set({ name, value: '', path: '/api/auth/oauth', maxAge: 0 });
  return res;
}

/** JSON seguro para embutir num `<script>`. */
function inlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Página que a janela popup mostra no fim: avisa a aba de origem e fecha. Se não conseguir fechar
 * (ou não houver aba de origem), segue para `fallback` — a pessoa nunca fica numa tela em branco.
 * BroadcastChannel porque a página do Google (COOP) pode cortar o `window.opener`.
 */
function popupResultPage(
  message: { ok: true } | { ok: false; error: string },
  fallback: string
): NextResponse {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Entrando…</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;color:#555">
<p>Entrando…</p>
<script>
(function () {
  var msg = ${inlineJson({ type: POPUP_MESSAGE, ...message })};
  try { var bc = new BroadcastChannel(msg.type); bc.postMessage(msg); bc.close(); } catch (e) {}
  try { if (window.opener && window.opener !== window) window.opener.postMessage(msg, location.origin); } catch (e) {}
  setTimeout(function () { window.close(); }, 100);
  setTimeout(function () { location.replace(${inlineJson(fallback)}); }, 1500);
})();
</script></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Fim do fluxo com erro: redirect para /login?erro=… ou, no popup, avisa a aba de origem. */
function loginErrorResponse(
  request: Request,
  code: string,
  returnTo?: string,
  popup = false
): Response {
  const url = new URL(LOGIN_PATH, resolveAppUrl(request));
  url.searchParams.set('erro', code);
  if (returnTo && returnTo !== '/') url.searchParams.set('returnTo', returnTo);
  if (popup) {
    // Cancelou na tela do Google: a janela só fecha; quem estava na página continua nela.
    const fallback = code === 'cancelado' && returnTo ? returnTo : `${url.pathname}${url.search}`;
    return clearCookie(popupResultPage({ ok: false, error: code }, fallback), FLOW_COOKIE);
  }
  return clearCookie(NextResponse.redirect(url, { status: 302 }), FLOW_COOKIE);
}

/**
 * `GET /api/auth/oauth/<provider>/start?returnTo=/algum/caminho[&popup=1]` → redireciona ao
 * provedor. Com `popup=1` o callback fecha a janela em vez de redirecionar.
 */
export function createOAuthStartHandler() {
  return async function handleOAuthStart(request: Request, ctx: RouteContext): Promise<Response> {
    const { provider: providerId } = await ctx.params;
    const provider = getOAuthProvider(providerId);
    if (!provider) {
      return NextResponse.json({ message: 'Provedor de login indisponivel.' }, { status: 404 });
    }

    const query = new URL(request.url).searchParams;
    const flow: FlowState = {
      p: provider.id,
      s: randomToken(),
      v: randomToken(48),
      n: randomToken(),
      r: sanitizeReturnTo(query.get('returnTo')),
      ...(query.get('popup') === '1' ? { m: 'popup' as const } : {}),
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

type LoginOutcome = { ok: true; token: string } | { ok: false; error: string };

/** Perfil já validado → cria/vincula a conta e emite a sessão. Comum ao callback e ao One Tap. */
async function completeExternalLogin(
  pgrstRpc: PgrstRpc,
  options: { pgrstTable?: PgrstTable },
  providerId: string,
  profile: OAuthProfile,
  requestId: string
): Promise<LoginOutcome> {
  try {
    const rpcRes = await pgrstRpc(
      'fun_auth__external_login',
      {
        p_provider: providerId,
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
        provider: providerId,
        email: profile.email ? maskEmail(profile.email) : null,
        status: rpcRes.status,
        message,
      });
      return {
        ok: false,
        error: message.includes('email_not_verified') ? 'email_nao_verificado' : 'falha_login',
      };
    }

    const displayName =
      profile.name?.trim() || (profile.email ? getDisplayNameFromEmail(profile.email) : 'Usuario');
    const session = issueSessionFromLoginResult(data, { displayName });
    // NULL = conta bloqueada/desativada.
    if (!session) return { ok: false, error: 'conta_bloqueada' };
    const { token } = session;
    const userId = session.user.user_id;

    if (data?.created === true) {
      await seedProfile(options.pgrstTable, token, userId, profile);
      if (profile.email) {
        await safeReportAccountRecreation({ login: profile.email, newUserId: userId });
      }
    }

    console.info('[auth.oauth] success', {
      requestId,
      provider: providerId,
      userId,
      created: data?.created === true,
      linked: data?.linked === true,
    });
    return { ok: true, token };
  } catch (error) {
    console.error('[auth.oauth] unexpected_error', {
      requestId,
      provider: providerId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: 'falha_login' };
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
    if (!provider) return loginErrorResponse(request, 'provedor_indisponivel');

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
      return loginErrorResponse(request, 'sessao_expirada');
    }
    const popup = flow.m === 'popup';

    // Usuário cancelou na tela do provedor, ou erro do provedor.
    if (params.get('error')) {
      return loginErrorResponse(request, 'cancelado', flow.r, popup);
    }

    const code = params.get('code');
    if (!code) return loginErrorResponse(request, 'falha_provedor', flow.r, popup);

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
      return loginErrorResponse(request, 'falha_provedor', flow.r, popup);
    }

    const outcome = await completeExternalLogin(pgrstRpc, options, provider.id, profile, requestId);
    if (!outcome.ok) return loginErrorResponse(request, outcome.error, flow.r, popup);

    const res = popup
      ? popupResultPage({ ok: true }, flow.r)
      : NextResponse.redirect(new URL(flow.r, resolveAppUrl(request)), { status: 302 });
    res.cookies.set(sessionCookieOptions(outcome.token));
    return clearCookie(res, FLOW_COOKIE);
  };
}

/**
 * Google One Tap (o "balãozinho" no canto da tela).
 * - `GET`  → `{ enabled, clientId, nonce }` e grava o nonce num cookie assinado.
 * - `POST { credential }` → valida o id_token (assinatura + nonce), cria/vincula a conta e abre a
 *   sessão. Responde `{ ok: true }` ou `{ ok: false, error }` (mesmos códigos do `?erro=`).
 * 404 quando o provedor não tem One Tap ou está desligado (`GOOGLE_ONE_TAP=false`).
 */
export function createOAuthOneTapHandlers(
  pgrstRpc: PgrstRpc,
  options: { pgrstTable?: PgrstTable } = {}
) {
  async function oneTapProvider(ctx: RouteContext) {
    const { provider: providerId } = await ctx.params;
    const provider = getOAuthProvider(providerId);
    const clientId = provider?.oneTapClientId?.();
    return provider && clientId && provider.verifyIdToken
      ? { provider, clientId, verifyIdToken: provider.verifyIdToken.bind(provider) }
      : null;
  }
  const disabled = () => NextResponse.json({ enabled: false }, { status: 404 });

  async function GET(_request: Request, ctx: RouteContext): Promise<Response> {
    const found = await oneTapProvider(ctx);
    if (!found) return disabled();
    const nonce = randomToken();
    const res = NextResponse.json(
      { enabled: true, clientId: found.clientId, nonce },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    res.cookies.set({
      name: ONETAP_COOKIE,
      value: jwt.sign({ p: found.provider.id, n: nonce }, jwtSecret(), {
        algorithm: 'HS256',
        expiresIn: FLOW_TTL_SEC,
      }),
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth/oauth',
      maxAge: FLOW_TTL_SEC,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  }

  async function POST(request: Request, ctx: RouteContext): Promise<Response> {
    const requestId = randomUUID();
    const found = await oneTapProvider(ctx);
    if (!found) return disabled();
    const providerId = found.provider.id;

    const fail = (error: string, status: number) =>
      clearCookie(NextResponse.json({ ok: false, error }, { status }), ONETAP_COOKIE);

    const raw = readCookie(request, ONETAP_COOKIE);
    let state: { p: string; n: string } | null = null;
    try {
      state = raw ? (jwt.verify(raw, jwtSecret()) as { p: string; n: string }) : null;
    } catch {
      state = null;
    }
    if (!state || state.p !== providerId) return fail('sessao_expirada', 400);

    const body = (await request.json().catch(() => null)) as { credential?: unknown } | null;
    const credential = typeof body?.credential === 'string' ? body.credential : '';
    if (!credential) return fail('falha_provedor', 400);

    let profile: OAuthProfile;
    try {
      profile = await found.verifyIdToken(credential, { nonce: state.n });
    } catch (error) {
      console.warn('[auth.oauth] onetap_invalid_token', {
        requestId,
        provider: providerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return fail('falha_provedor', 401);
    }

    const outcome = await completeExternalLogin(pgrstRpc, options, providerId, profile, requestId);
    if (!outcome.ok) return fail(outcome.error, outcome.error === 'falha_login' ? 500 : 403);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(sessionCookieOptions(outcome.token));
    return clearCookie(res, ONETAP_COOKIE);
  }

  return { GET, POST };
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
