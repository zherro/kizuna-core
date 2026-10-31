import { type NextRequest } from 'next/server';
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
/**
 * Builds a Next.js `proxy` function (the renamed `middleware`) that gates a set of
 * protected path prefixes behind a valid JWT session cookie and bounces
 * authenticated users away from the auth screens.
 *
 * The consuming project's `src/proxy.ts` becomes a call to this plus a static
 * `export const config = { matcher: [...] }` (the matcher must stay literal in the
 * project file so Next can statically analyse it).
 */
export declare function createKizunaProxy(options?: KizunaProxyOptions): (request: NextRequest) => any;
//# sourceMappingURL=proxy.d.ts.map