import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

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

function hasValidSession(token: string | undefined): boolean {
  if (!token) return false;
  try {
    jwt.verify(token, getSecret());
    return true;
  } catch {
    return false;
  }
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

  return function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get(sessionCookie)?.value;
    const authenticated = hasValidSession(token);

    if (authPages.some((p) => pathname.startsWith(p))) {
      if (authenticated) {
        return NextResponse.redirect(new URL(panelPath, request.url));
      }
      return NextResponse.next();
    }

    if (protectedPrefixes.some((p) => pathname.startsWith(p)) && !authenticated) {
      return NextResponse.redirect(new URL(loginPath, request.url));
    }

    return NextResponse.next();
  };
}
