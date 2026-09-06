/**
 * Auth route handler factories. A new project wires these into:
 * - src/app/api/auth/login/route.ts    → `export const POST = createLoginHandler(pgrstRpc)`
 * - src/app/api/auth/register/route.ts → `export const POST = createRegisterHandler(pgrstRpc)`
 * - src/app/api/auth/logout/route.ts   → `export const POST = createLogoutHandler()`
 *
 * Depends on two RPCs existing in the project's Postgres schema:
 * `fun_auth__login_with_perms(p_login, p_password)` and `fun_auth__signup_bootstrap(p_login, p_password)`.
 */
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { apiError } from './api-error';
import { signSession, maskEmail, getDisplayNameFromEmail, getDisplayName, isValidEmail, isConfigError, } from './auth';
function asError(error) {
    if (error instanceof Error)
        return error;
    return new Error(typeof error === 'string' ? error : JSON.stringify(error));
}
/**
 * Factory para criar handler de LOGIN.
 * Novo projeto passa sua função `pgrstRpc` (ver `@kizuna/core/server`'s `pgrstRpc`).
 */
export function createLoginHandler(pgrstRpc) {
    return async function handleLogin(request) {
        const requestId = randomUUID();
        let body;
        try {
            body = (await request.json());
        }
        catch (error) {
            const err = asError(error);
            console.error('[auth.login] invalid_json_body', {
                requestId,
                method: request.method,
                path: new URL(request.url).pathname,
                error: err.message,
            });
            return NextResponse.json({ message: 'Corpo da requisicao invalido.' }, { status: 400 });
        }
        const email = body.email?.trim() ?? '';
        const password = body.password?.trim() ?? '';
        const emailMasked = maskEmail(email);
        if (!email || !password) {
            console.warn('[auth.login] missing_credentials', {
                requestId,
                path: new URL(request.url).pathname,
                hasEmail: Boolean(email),
                hasPassword: Boolean(password),
            });
            return NextResponse.json({ message: 'Informe email e senha.' }, { status: 400 });
        }
        try {
            const rpcRes = await pgrstRpc('fun_auth__login_with_perms', { p_login: email, p_password: password }, { auth: null });
            const rpcJson = (await rpcRes.json().catch(() => null));
            const data = (rpcJson?.data ?? rpcJson) ?? null;
            const userId = (data?.user_id ?? data?.user_uid);
            const tenantId = (data?.tenant_id ?? data?.tenant_uid);
            const tenantType = data?.tenant_type;
            const perms = data?.perms;
            const isRoot = data?.is_root;
            if (!rpcRes.ok) {
                const details = rpcJson?.details ||
                    rpcJson?.hint ||
                    rpcJson?.message;
                console.warn('[auth.login] invalid_credentials_from_postgrest', {
                    requestId,
                    path: new URL(request.url).pathname,
                    postgrestStatus: rpcRes.status,
                    email: emailMasked,
                    details,
                });
                return NextResponse.json({
                    message: 'Credenciais invalidas.',
                    error: apiError({ code: '401', message: 'invalid_credentials', details }),
                }, { status: 401 });
            }
            if (!userId || !tenantId) {
                console.error('[auth.login] missing_identity_fields', {
                    requestId,
                    path: new URL(request.url).pathname,
                    email: emailMasked,
                    hasUserId: Boolean(userId),
                    hasTenantId: Boolean(tenantId),
                    responseKeys: data ? Object.keys(data) : [],
                });
                return NextResponse.json({ message: 'Credenciais invalidas.' }, { status: 401 });
            }
            const displayName = getDisplayNameFromEmail(email);
            const token = signSession({
                user_id: userId,
                tenant_id: tenantId,
                tenant_type: tenantType,
                perms,
                login: email,
                display_name: displayName,
                is_root: isRoot,
            });
            const response = NextResponse.json({
                message: 'Login realizado com sucesso.',
                user: {
                    user_id: userId,
                    display_name: displayName,
                    login: email,
                    tenant_type: tenantType,
                    perms,
                    is_root: isRoot,
                },
            });
            response.cookies.set({
                name: 'session',
                value: token,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            });
            console.info('[auth.login] success', {
                requestId,
                path: new URL(request.url).pathname,
                email: emailMasked,
                userId,
                tenantId,
            });
            return response;
        }
        catch (error) {
            const err = asError(error);
            console.error('[auth.login] unexpected_error', {
                requestId,
                path: new URL(request.url).pathname,
                email: emailMasked,
                error: err.message,
                stack: err.stack,
            });
            if (isConfigError(err.message)) {
                return NextResponse.json({
                    message: 'Configuracao de autenticacao incompleta no servidor.',
                    error: apiError({
                        code: 'AUTH_CONFIG_MISSING',
                        message: 'missing_jwt_secret_env',
                        details: 'Defina PGRST_JWT_SECRET (ou JWT_SECRET) no ambiente.',
                    }),
                }, { status: 500 });
            }
            return NextResponse.json({ message: 'Erro inesperado. Tente novamente mais tarde.' }, { status: 500 });
        }
    };
}
/**
 * Factory para criar handler de REGISTER.
 */
export function createRegisterHandler(pgrstRpc) {
    return async function handleRegister(request) {
        const requestId = randomUUID();
        let body;
        try {
            body = (await request.json());
        }
        catch (error) {
            const err = asError(error);
            console.error('[auth.register] invalid_json_body', {
                requestId,
                method: request.method,
                path: new URL(request.url).pathname,
                error: err.message,
            });
            return NextResponse.json({ message: 'Corpo da requisicao invalido.' }, { status: 400 });
        }
        const name = body.name?.trim() ?? '';
        const email = body.email?.trim() ?? '';
        const password = body.password?.trim() ?? '';
        const acceptTerms = body.acceptTerms === true;
        const emailMasked = maskEmail(email);
        if (!name || !email || !password) {
            console.warn('[auth.register] missing_required_fields', {
                requestId,
                path: new URL(request.url).pathname,
                hasName: Boolean(name),
                hasEmail: Boolean(email),
                hasPassword: Boolean(password),
                acceptTerms,
            });
            return NextResponse.json({ message: 'Preencha nome, email e senha.' }, { status: 400 });
        }
        if (!isValidEmail(email)) {
            return NextResponse.json({ message: 'Email invalido.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ message: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
        }
        if (!acceptTerms) {
            return NextResponse.json({ message: 'Voce precisa aceitar os termos para criar a conta.' }, { status: 400 });
        }
        try {
            // Step 1: Signup
            const signupRes = await pgrstRpc('fun_auth__signup_bootstrap', { p_login: email, p_password: password }, { auth: null });
            const signupJson = (await signupRes.json().catch(() => null)) ?? null;
            if (!signupRes.ok) {
                const signupErrorMessage = signupJson?.message ?? '';
                const signupErrorDetails = signupJson?.details ||
                    signupJson?.hint ||
                    signupJson?.error;
                const signupErrorCode = String(signupJson?.code ?? '');
                if (signupErrorCode === '23505' ||
                    /users_email_key|already exists|duplicate key/i.test(`${signupErrorMessage} ${signupErrorDetails ?? ''}`)) {
                    console.warn('[auth.register] duplicate_email', {
                        requestId,
                        path: new URL(request.url).pathname,
                        email: emailMasked,
                        signupErrorCode,
                        signupErrorDetails,
                    });
                    return NextResponse.json({ message: 'Ja existe conta com este email.' }, { status: 409 });
                }
                console.error('[auth.register] signup_rpc_failed', {
                    requestId,
                    path: new URL(request.url).pathname,
                    email: emailMasked,
                    postgrestStatus: signupRes.status,
                    signupErrorCode,
                    signupErrorMessage,
                    signupErrorDetails,
                });
                return NextResponse.json({
                    message: 'Nao foi possivel criar a conta agora.',
                    error: apiError({
                        code: signupErrorCode || '400',
                        message: 'temporary_auth_failure',
                        details: `${signupErrorMessage} ==> ${signupErrorDetails ?? ''}`,
                    }),
                }, { status: 400 });
            }
            // Step 2: Auto-login
            const loginRes = await pgrstRpc('fun_auth__login_with_perms', { p_login: email, p_password: password }, { auth: null });
            const loginJson = (await loginRes.json().catch(() => null)) ?? null;
            const loginData = (loginJson?.data ?? loginJson) ?? null;
            const userId = (loginData?.user_id ?? loginData?.user_uid);
            const tenantId = (loginData?.tenant_id ?? loginData?.tenant_uid);
            const tenantType = loginData?.tenant_type;
            const perms = loginData?.perms;
            const isRoot = loginData?.is_root;
            if (!loginRes.ok || !userId || !tenantId) {
                console.error('[auth.register] auto_login_failed', {
                    requestId,
                    path: new URL(request.url).pathname,
                    email: emailMasked,
                    postgrestStatus: loginRes.status,
                    hasUserId: Boolean(userId),
                    hasTenantId: Boolean(tenantId),
                });
                return NextResponse.json({
                    message: 'Conta criada, mas nao foi possivel autenticar automaticamente.',
                    error: apiError({
                        code: '500',
                        message: 'login_with_perms_failed',
                        details: loginJson?.details ||
                            loginJson?.hint ||
                            loginJson?.message,
                    }),
                }, { status: 500 });
            }
            const displayName = getDisplayName(name, email);
            const token = signSession({
                user_id: userId,
                tenant_id: tenantId,
                tenant_type: tenantType,
                perms,
                login: email,
                display_name: displayName,
                is_root: isRoot,
            });
            const response = NextResponse.json({
                message: 'Conta criada com sucesso.',
                user: {
                    user_id: userId,
                    display_name: displayName,
                    login: email,
                    tenant_type: tenantType,
                    perms,
                    is_root: isRoot,
                },
            }, { status: 201 });
            response.cookies.set({
                name: 'session',
                value: token,
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            });
            console.info('[auth.register] success', {
                requestId,
                path: new URL(request.url).pathname,
                email: emailMasked,
                userId,
                tenantId,
            });
            return response;
        }
        catch (error) {
            const err = asError(error);
            console.error('[auth.register] unexpected_error', {
                requestId,
                path: new URL(request.url).pathname,
                email: emailMasked,
                error: err.message,
                stack: err.stack,
            });
            if (isConfigError(err.message)) {
                return NextResponse.json({
                    message: 'Configuracao de autenticacao incompleta no servidor.',
                    error: apiError({
                        code: 'AUTH_CONFIG_MISSING',
                        message: 'missing_jwt_secret_env',
                        details: 'Defina PGRST_JWT_SECRET (ou JWT_SECRET) no ambiente.',
                    }),
                }, { status: 500 });
            }
            return NextResponse.json({ message: 'Erro interno. Tente novamente mais tarde.' }, { status: 500 });
        }
    };
}
/**
 * Factory para criar handler de LOGOUT.
 */
export function createLogoutHandler() {
    return async function handleLogout(_request) {
        const response = NextResponse.json({ message: 'Logout realizado com sucesso.' });
        response.cookies.set({
            name: 'session',
            value: '',
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
        });
        return response;
    };
}
//# sourceMappingURL=auth-handlers.js.map