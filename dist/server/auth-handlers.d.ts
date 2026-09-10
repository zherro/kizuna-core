/**
 * Auth route handler factories. A new project wires these into:
 * - src/app/api/auth/login/route.ts    → `export const POST = createLoginHandler(pgrstRpc)`
 * - src/app/api/auth/register/route.ts → `export const POST = createRegisterHandler(pgrstRpc)`
 * - src/app/api/auth/logout/route.ts   → `export const POST = createLogoutHandler()`
 *
 * Depends on two RPCs existing in the project's Postgres schema:
 * `fun_auth__login_with_perms(p_login, p_password)` and `fun_auth__signup_bootstrap(p_login, p_password)`.
 */
export type LoginRequestBody = {
    email?: string;
    password?: string;
    /** Token do Cloudflare Turnstile — só verificado quando `isCaptchaEnabled()` (keys nas envs). */
    captchaToken?: string | null;
};
export type RegisterRequestBody = {
    name?: string;
    email?: string;
    password?: string;
    acceptTerms?: boolean;
    captchaToken?: string | null;
};
export type LogoutRequestBody = Record<string, never>;
type PgrstRpc = (name: string, payload: any, opts?: any) => Promise<Response>;
/**
 * Factory para criar handler de LOGIN.
 * Novo projeto passa sua função `pgrstRpc` (ver `@kizuna/core/server`'s `pgrstRpc`).
 */
export declare function createLoginHandler(pgrstRpc: PgrstRpc): (request: Request) => Promise<Response>;
/**
 * Factory para criar handler de REGISTER.
 */
export declare function createRegisterHandler(pgrstRpc: PgrstRpc): (request: Request) => Promise<Response>;
/**
 * Factory para criar handler de LOGOUT.
 */
export declare function createLogoutHandler(): (_request: Request) => Promise<Response>;
/**
 * `GET /api/auth/me` — devolve a sessão atual (`{ user }`) ou `{ user: null }`,
 * lendo o cookie de sessão. Serve para o `AuthProvider` hidratar do lado
 * cliente quando o layout raiz NÃO lê cookie (páginas públicas estáticas —
 * ver docs/HARDENING.md). O payload é o mesmo shape que `createLoginHandler`
 * retorna em `user`.
 */
export declare function createMeHandler(): () => Promise<any>;
export {};
//# sourceMappingURL=auth-handlers.d.ts.map