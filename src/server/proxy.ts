import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { checkKizunaEnv, type MissingEnv } from '../lib/env-guard';
import { hasServiceAccess } from './service-db';
import {
  createSessionRevocationChecker,
  fetchUserStatusViaService,
} from './account/session-revocation';

/**
 * Options for {@link createKizunaProxy}. Every field has a sensible default — a
 * project only overrides what differs from the standard `/painel` + `/login` shape.
 */
export type KizunaProxyOptions = {
  /** Path prefixes that require a valid session; unauthenticated hits redirect to `loginPath`. */
  protectedPrefixes?: string[];
  /** Auth-screen paths; an already-authenticated hit redirects to `panelPath`. */
  authPages?: string[];
  /** Where to send an unauthenticated request for a protected path. */
  loginPath?: string;
  /** Where to send an authenticated request that lands on an auth page. */
  panelPath?: string;
  /** Session cookie name (defaults to `session`, matching the core auth handlers). */
  sessionCookie?: string;
};

function getSecret(): string {
  return process.env.PGRST_JWT_SECRET ?? process.env.JWT_SECRET ?? '';
}

// Página de bloqueio quando falta env obrigatória. Renderizada como string
// porque o proxy roda antes do render e não monta React.
function setupRequiredHtml(missing: MissingEnv[]): string {
  const rows = missing
    .map(
      (m) =>
        `<li style="border:1px solid #26262c;border-radius:10px;padding:12px 14px;background:#141417">
           <code style="font-size:14px;font-weight:700;color:#f4b8b8">${m.name}</code>
           <p style="margin:6px 0 0;font-size:13px;color:#9a9aa4;line-height:1.5">${m.hint}</p>
         </li>`
    )
    .join('');
  const envLines = missing.map((m) => `${m.name}=`).join('\n');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Configuração necessária</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
background:#0b0b0c;color:#e7e7ea;font-family:system-ui,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<main style="max-width:560px;width:100%">
<p style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:#8a8a94;margin:0">kizuna-core</p>
<h1 style="font-size:26px;font-weight:600;margin:10px 0 6px">Configuração necessária</h1>
<p style="color:#a8a8b2;line-height:1.6;margin-top:0">Este projeto exige <strong>PostgREST</strong> e um segredo de JWT.
Defina as variáveis abaixo em <code style="background:#1c1c20;padding:2px 6px;border-radius:4px">.env</code>
(copie de <code style="background:#1c1c20;padding:2px 6px;border-radius:4px">.env.example</code>) e recarregue.</p>
<ul style="list-style:none;padding:0;margin:20px 0 0;display:grid;gap:12px">${rows}</ul>
<pre style="margin-top:20px;background:#141417;border:1px solid #26262c;border-radius:10px;padding:14px;
font-size:13px;color:#c8c8d0;overflow-x:auto">cp .env.example .env
# preencha:
${envLines}</pre>
</main></body></html>`;
}

/** Cópia dos headers sem o cookie `name` (a página segue como deslogada nesta requisição). */
function withoutCookie(headers: Headers, name: string): Headers {
  const copy = new Headers(headers);
  const kept = (headers.get('cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${name}=`));
  if (kept.length > 0) copy.set('cookie', kept.join('; '));
  else copy.delete('cookie');
  return copy;
}

type DecodedSession = { user_id: string; iat: number };

function decodeSession(token: string | undefined): DecodedSession | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret()) as Partial<DecodedSession>;
    return payload.user_id ? { user_id: payload.user_id, iat: payload.iat ?? 0 } : null;
  } catch {
    return null;
  }
}

// Conta excluída/bloqueada derruba sessões já emitidas (JWT de 7 dias) — ver
// account/session-revocation.ts. Sem token de serviço o check fica desligado.
const revocation = createSessionRevocationChecker({ fetchStatus: fetchUserStatusViaService });
let warnedNoServiceAccess = false;

async function isSessionActive(session: DecodedSession | null): Promise<boolean> {
  if (!session) return false;
  if (!hasServiceAccess()) {
    if (!warnedNoServiceAccess) {
      console.warn('[proxy] POSTGREST_SERVICE_TOKEN ausente — revogação de sessão desligada.');
      warnedNoServiceAccess = true;
    }
    return true;
  }
  return !(await revocation.isRevoked(session.user_id, session.iat));
}

/**
 * Builds a Next.js `proxy` function (the renamed `middleware`) that gates a set of
 * protected path prefixes behind a valid JWT session cookie and bounces
 * authenticated users away from the auth screens.
 *
 * The consuming project's `src/proxy.ts` becomes a call to this plus a static
 * `export const config = { matcher: [...] }` (the matcher must stay literal in the
 * project file so Next can statically analyse it).
 */
export function createKizunaProxy(options: KizunaProxyOptions = {}) {
  const protectedPrefixes = options.protectedPrefixes ?? ['/painel'];
  const authPages = options.authPages ?? ['/login', '/registre-se'];
  const loginPath = options.loginPath ?? '/login';
  const panelPath = options.panelPath ?? '/painel';
  const sessionCookie = options.sessionCookie ?? 'session';

  return async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // TRAVA DE AMBIENTE — sem PostgREST + segredo de JWT nada roda.
    // Só deixa passar assets e o HMR do dev.
    if (!pathname.startsWith('/_next') && pathname !== '/favicon.ico') {
      const env = checkKizunaEnv();
      if (!env.ok) {
        return new NextResponse(setupRequiredHtml(env.missing), {
          status: 503,
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
          },
        });
      }
    }

    const token = request.cookies.get(sessionCookie)?.value;
    const authenticated = await isSessionActive(decodeSession(token));

    // Cookie presente mas sessão inválida/revogada: tira da requisição (esta página já renderiza
    // deslogada) e apaga no navegador.
    const staleSession = Boolean(token) && !authenticated;

    const finish = (response: NextResponse) => {
      if (staleSession) {
        response.cookies.set({ name: sessionCookie, value: '', path: '/', maxAge: 0 });
      }
      return response;
    };
    // Só reescreve os headers da requisição quando tirou o cookie; repassar sempre os headers
    // originais quebra o roteamento das rotas de API no Next 16 (404 em todo /api/*).
    const next = () =>
      finish(
        staleSession
          ? NextResponse.next({
              request: { headers: withoutCookie(request.headers, sessionCookie) },
            })
          : NextResponse.next()
      );

    if (authPages.some((p) => pathname.startsWith(p))) {
      if (authenticated) {
        return NextResponse.redirect(new URL(panelPath, request.url));
      }
      return next();
    }

    if (protectedPrefixes.some((p) => pathname.startsWith(p)) && !authenticated) {
      return finish(NextResponse.redirect(new URL(loginPath, request.url)));
    }

    return next();
  };
}
