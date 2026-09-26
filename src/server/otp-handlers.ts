/**
 * Login/verificação por telefone com código (OTP). Um projeto liga assim:
 * - src/app/api/auth/otp/request/route.ts → `export const POST = createOtpRequestHandler(pgrstRpc, { config: cfg.otp })`
 * - src/app/api/auth/otp/verify/route.ts  → `export const POST = createOtpVerifyHandler(pgrstRpc, { config: cfg.otp })`
 *
 * Depende de `auth.fun_auth__otp_create` / `auth.fun_auth__otp_verify` (sql/0114_phone_otp.sql).
 * O envio sai pela porta `OtpProvider` (otp/registry.ts); sem provedor utilizável → 404.
 */

import { NextResponse } from 'next/server';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { apiError } from './api-error';
import { getSession, sessionCookieOptions } from './auth';
import { verifyCaptcha } from './captcha';
import { checkLockout, clearLoginFailures, recordLoginFailure } from './login-lockout';
import { maskPhone, normalizeBrMobile } from './otp/phone';
import { resolveOtpChain, resolveOtpConfig, sendOtp } from './otp/registry';
import type { OtpConfig, OtpPurpose } from './otp/types';
import { issueSessionFromLoginResult, purposeAuthHeader } from './session-issue';

type PgrstRpc = (name: string, payload: any, opts?: any) => Promise<Response>;
type OtpHandlerOptions = { config?: OtpConfig };

export type OtpRequestBody = { phone?: string; purpose?: OtpPurpose; captchaToken?: string | null };
export type OtpVerifyBody = { phone?: string; code?: string; purpose?: OtpPurpose };

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || '';
}

/** HMAC com o segredo do servidor: o banco nunca vê o código nem um hash quebrável dele. */
export function hashOtpCode(phone: string, purpose: OtpPurpose, code: string): string {
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
  return createHmac('sha256', secret).update(`${phone}:${purpose}:${code}`).digest('hex');
}

export function generateOtpCode(length: number): string {
  return String(randomInt(0, 10 ** length)).padStart(length, '0');
}

function parsePurpose(value: unknown): OtpPurpose {
  return value === 'verify_phone' ? 'verify_phone' : 'login';
}

function disabled(): Response {
  return NextResponse.json({ message: 'Login por telefone indisponivel.' }, { status: 404 });
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/** `POST /api/auth/otp/request` — `{ phone, purpose?, captchaToken? }`. */
export function createOtpRequestHandler(pgrstRpc: PgrstRpc, options: OtpHandlerOptions = {}) {
  return async function handleOtpRequest(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const chain = resolveOtpChain(options.config);
    if (!chain.length) return disabled();
    const cfg = resolveOtpConfig(options.config);

    const body = await readJson<OtpRequestBody>(request);
    if (!body)
      return NextResponse.json({ message: 'Corpo da requisicao invalido.' }, { status: 400 });

    const phone = normalizeBrMobile(body.phone);
    if (!phone) {
      return NextResponse.json({ message: 'Informe um celular valido com DDD.' }, { status: 400 });
    }
    const purpose = parsePurpose(body.purpose);

    let userUid: string | null = null;
    if (purpose === 'verify_phone') {
      const session = await getSession();
      if (!session) return NextResponse.json({ message: 'Entre na sua conta.' }, { status: 401 });
      userUid = session.user_id;
    }

    const ip = clientIp(request);
    const keys = [`otp:${phone}`, ...(ip ? [`otp-ip:${ip}`] : [])];
    for (const key of keys) {
      const lock = checkLockout(key);
      if (lock.locked) {
        return NextResponse.json(
          { message: 'Muitos pedidos seguidos. Aguarde um pouco e tente de novo.' },
          { status: 429, headers: { 'Retry-After': String(lock.retryAfterSec) } }
        );
      }
    }

    const captcha = await verifyCaptcha(body.captchaToken, ip || null);
    if (!captcha.ok) {
      return NextResponse.json(
        {
          message: 'Verificacao de seguranca falhou. Recarregue a pagina e tente novamente.',
          error: apiError({ code: '400', message: 'captcha_failed', details: captcha.reason }),
        },
        { status: 400 }
      );
    }

    // Cada pedido conta no throttle (mesmo mecanismo do "esqueci a senha"): segura SMS pumping.
    for (const key of keys) recordLoginFailure(key);

    try {
      const code = generateOtpCode(cfg.codeLength);
      const rpcRes = await pgrstRpc(
        'fun_auth__otp_create',
        {
          p_phone: phone,
          p_purpose: purpose,
          p_code_hash: hashOtpCode(phone, purpose, code),
          p_ttl_sec: cfg.ttlSec,
          p_ip: ip || null,
          p_user_uid: userUid,
          p_cooldown_sec: cfg.cooldownSec,
          p_daily_limit: cfg.dailyLimit,
        },
        { auth: purposeAuthHeader('otp'), schema: 'auth' }
      );

      if (!rpcRes.ok) {
        const data = (await rpcRes.json().catch(() => null)) as Record<string, unknown> | null;
        const message = String(data?.message ?? '');
        if (message.includes('otp_cooldown')) {
          return NextResponse.json(
            { message: 'Aguarde um minuto antes de pedir outro codigo.' },
            { status: 429, headers: { 'Retry-After': String(cfg.cooldownSec) } }
          );
        }
        if (message.includes('otp_daily_limit')) {
          return NextResponse.json(
            { message: 'Limite de codigos para este numero atingido hoje.' },
            { status: 429 }
          );
        }
        console.error('[auth.otp] create_failed', { requestId, status: rpcRes.status, message });
        return NextResponse.json(
          { message: 'Nao foi possivel enviar o codigo agora.' },
          { status: 500 }
        );
      }

      const sent = await sendOtp(chain, {
        phone,
        code,
        expiresInSec: cfg.ttlSec,
        purpose,
        locale: cfg.locale,
        requestId,
      });
      if (!sent.ok) {
        console.error('[auth.otp] send_failed', {
          requestId,
          phone: maskPhone(phone),
          error: sent.error,
        });
        return NextResponse.json(
          { message: 'Nao foi possivel enviar o codigo agora.' },
          { status: 503 }
        );
      }

      console.info('[auth.otp] sent', {
        requestId,
        phone: maskPhone(phone),
        provider: sent.provider,
      });
      return NextResponse.json({
        message: 'Enviamos um codigo para o seu celular.',
        phone: maskPhone(phone),
        expiresInSec: cfg.ttlSec,
        resendInSec: cfg.cooldownSec,
        codeLength: cfg.codeLength,
      });
    } catch (error) {
      console.error('[auth.otp] unexpected_error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { message: 'Erro inesperado. Tente novamente mais tarde.' },
        { status: 500 }
      );
    }
  };
}

const VERIFY_ERRORS: Record<string, { status: number; message: string }> = {
  invalid: { status: 400, message: 'Codigo invalido.' },
  expired: { status: 400, message: 'Codigo expirado. Peca um novo.' },
  too_many_attempts: { status: 429, message: 'Muitas tentativas. Peca um novo codigo.' },
  phone_in_use: { status: 409, message: 'Este celular ja esta ligado a outra conta.' },
  blocked: { status: 403, message: 'Esta conta esta bloqueada.' },
};

/** `POST /api/auth/otp/verify` — `{ phone, code, purpose? }`. Em `login`, abre a sessão. */
export function createOtpVerifyHandler(pgrstRpc: PgrstRpc, options: OtpHandlerOptions = {}) {
  return async function handleOtpVerify(request: Request): Promise<Response> {
    const requestId = randomUUID();
    if (!resolveOtpChain(options.config).length) return disabled();
    const cfg = resolveOtpConfig(options.config);

    const body = await readJson<OtpVerifyBody>(request);
    const phone = normalizeBrMobile(body?.phone);
    const code = String(body?.code ?? '').replace(/\D+/g, '');
    if (!phone || code.length !== cfg.codeLength) {
      return NextResponse.json(
        { message: 'Informe o celular e o codigo recebido.' },
        { status: 400 }
      );
    }
    const purpose = parsePurpose(body?.purpose);

    let userUid: string | null = null;
    if (purpose === 'verify_phone') {
      const session = await getSession();
      if (!session) return NextResponse.json({ message: 'Entre na sua conta.' }, { status: 401 });
      userUid = session.user_id;
    }

    const ip = clientIp(request);
    const keys = [`otp-verify:${phone}`, ...(ip ? [`otp-verify-ip:${ip}`] : [])];
    for (const key of keys) {
      const lock = checkLockout(key);
      if (lock.locked) {
        return NextResponse.json(
          { message: 'Muitas tentativas. Aguarde antes de tentar de novo.' },
          { status: 429, headers: { 'Retry-After': String(lock.retryAfterSec) } }
        );
      }
    }

    try {
      const rpcRes = await pgrstRpc(
        'fun_auth__otp_verify',
        {
          p_phone: phone,
          p_purpose: purpose,
          p_code_hash: hashOtpCode(phone, purpose, code),
          p_user_uid: userUid,
          p_max_attempts: cfg.maxAttempts,
        },
        { auth: purposeAuthHeader('otp'), schema: 'auth' }
      );
      const data = (await rpcRes.json().catch(() => null)) as Record<string, unknown> | null;

      if (!rpcRes.ok) {
        console.error('[auth.otp] verify_rpc_failed', { requestId, status: rpcRes.status });
        return NextResponse.json(
          { message: 'Nao foi possivel validar o codigo agora.' },
          { status: 500 }
        );
      }

      if (data?.ok !== true) {
        for (const key of keys) recordLoginFailure(key);
        const err = VERIFY_ERRORS[String(data?.reason)] ?? VERIFY_ERRORS.invalid!;
        return NextResponse.json(
          { message: err.message, reason: data?.reason },
          { status: err.status }
        );
      }

      for (const key of keys) clearLoginFailures(key);

      if (purpose === 'verify_phone') {
        return NextResponse.json({ message: 'Celular verificado.', phone: maskPhone(phone) });
      }

      const session = issueSessionFromLoginResult(data, { displayName: maskPhone(phone) });
      if (!session) {
        return NextResponse.json({ message: 'Nao foi possivel entrar agora.' }, { status: 500 });
      }

      console.info('[auth.otp] login', {
        requestId,
        phone: maskPhone(phone),
        userId: session.user.user_id,
        created: data?.created === true,
      });

      const res = NextResponse.json({
        message: 'Login realizado com sucesso.',
        user: session.user,
        created: data?.created === true,
      });
      res.cookies.set(sessionCookieOptions(session.token));
      return res;
    } catch (error) {
      console.error('[auth.otp] verify_unexpected_error', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { message: 'Erro inesperado. Tente novamente mais tarde.' },
        { status: 500 }
      );
    }
  };
}
