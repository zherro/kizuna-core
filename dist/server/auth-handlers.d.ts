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
};
export type RegisterRequestBody = {
    name?: string;
    email?: string;
    password?: string;
    acceptTerms?: boolean;
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
export {};
//# sourceMappingURL=auth-handlers.d.ts.map