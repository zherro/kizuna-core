/**
 * Recuperação de senha ("esqueci minha senha") — handlers de rota.
 *
 * Vive em `@kizuna/core/server/password-reset` (e não em `@kizuna/core/server`) porque envia
 * e-mail: um projeto que não usa o fluxo nunca puxa `nodemailer`.
 *
 * O projeto liga assim:
 * - src/app/api/auth/forgot-password/route.ts → `export const POST = createForgotPasswordHandler(pgrstRpc)`
 * - src/app/api/auth/reset-password/route.ts  → `export const POST = createResetPasswordHandler(pgrstRpc)`
 *
 * Depende das RPCs de `sql/0112_password_reset.sql`. Elas só aceitam chamadas com o claim
 * `purpose: "password_reset"` no JWT — assinado aqui com PGRST_JWT_SECRET.
 */

import { NextResponse } from 'next/server';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { apiError } from './api-error';
import { resolveAppUrl } from './app-url';
import { isValidEmail, maskEmail } from './auth';
import { verifyCaptcha } from './captcha';
import { checkLockout, recordLoginFailure } from './login-lockout';
import { sendEmail, type EmailTemplate } from './email';

type PgrstRpc = (name: string, payload: any, opts?: any) => Promise<Response>;

export type ForgotPasswordRequestBody = {
  email?: string;
  /** Token do Cloudflare Turnstile — só verificado quando `isCaptchaEnabled()`. */
  captchaToken?: string | null;
};

export type ResetPasswordRequestBody = {
  token?: string;
  password?: string;
};

export type PasswordResetEmailInput = {
  email: string;
  resetUrl: string;
  expiresInMinutes: number;
  appName: string;
};

export type ForgotPasswordOptions = {
  /** Caminho da tela que recebe `?token=`. Default: `/redefinir-senha`. */
  resetPath?: string;
  /** Validade do link em minutos (5–1440). Default: env `PASSWORD_RESET_TTL_MINUTES` ou 60. */
  expiresInMinutes?: number;
  /** Troca o e-mail padrão pelo do projeto (copy/branding). */
  buildEmail?: (input: PasswordResetEmailInput) => EmailTemplate;
};

/** Mensagem única para "conta existe" e "não existe" — não revela quem tem cadastro. */
const GENERIC_OK_MESSAGE =
  'Se existir uma conta com este email, enviaremos um link para redefinir a senha.';

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || '';
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** JWT curto que autoriza só as RPCs de reset (claim `purpose`). */
function purposeAuthHeader(): string {
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
  const token = jwt.sign({ role: 'anon', purpose: 'password_reset' }, secret, {
    algorithm: 'HS256',
    expiresIn: '2m',
  });
  return `Bearer ${token}`;
}

function resolveTtl(opt?: number): number {
  const raw = opt ?? Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60);
  return Number.isFinite(raw) ? Math.min(1440, Math.max(5, Math.round(raw))) : 60;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

/** E-mail padrão de redefinição. Troque via `options.buildEmail`. */
export function buildPasswordResetEmail(input: PasswordResetEmailInput): EmailTemplate {
  const { resetUrl, expiresInMinutes, appName } = input;
  const safeApp = escapeHtml(appName);
  const safeUrl = escapeHtml(resetUrl);
  return {
    subject: `${appName} — redefinir senha`,
    text:
      `Recebemos um pedido para redefinir a senha da sua conta em ${appName}.\n\n` +
      `Abra o link abaixo para criar uma nova senha (válido por ${expiresInMinutes} minutos):\n` +
      `${resetUrl}\n\n` +
      `Se você não pediu, ignore este e-mail — sua senha continua a mesma.`,
    html:
      `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">` +
      `<h2 style="margin:0 0 16px">Redefinir senha</h2>` +
      `<p>Recebemos um pedido para redefinir a senha da sua conta em <strong>${safeApp}</strong>.</p>` +
      `<p style="margin:24px 0"><a href="${safeUrl}" style="background:#111;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Criar nova senha</a></p>` +
      `<p style="font-size:13px;color:#555">O link vale por ${expiresInMinutes} minutos e só pode ser usado uma vez.</p>` +
      `<p style="font-size:13px;color:#555">Se o botão não funcionar, copie e cole:<br><span style="word-break:break-all">${safeUrl}</span></p>` +
      `<p style="font-size:13px;color:#555">Se você não pediu, ignore este e-mail — sua senha continua a mesma.</p>` +
      `</div>`,
  };
}

/**
 * `POST /api/auth/forgot-password` — `{ email, captchaToken? }`.
 * Sempre responde 200 com a mesma mensagem (exceto validação, captcha e throttle).
 */
export function createForgotPasswordHandler(
  pgrstRpc: PgrstRpc,
  options: ForgotPasswordOptions = {}
) {
  const resetPath = options.resetPath ?? '/redefinir-senha';
  const buildEmail = options.buildEmail ?? buildPasswordResetEmail;

  return async function handleForgotPassword(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const path = new URL(request.url).pathname;

    let body: ForgotPasswordRequestBody;
    try {
      body = (await request.json()) as ForgotPasswordRequestBody;
    } catch {
      return NextResponse.json({ message: 'Corpo da requisicao invalido.' }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase() ?? '';
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ message: 'Informe um email valido.' }, { status: 400 });
    }
    const emailMasked = maskEmail(email);

    // Throttle por email e por IP (mesmo mecanismo em memória do lockout de login).
    const ip = clientIp(request);
    const keys = [`reset:${email}`, ...(ip ? [`reset-ip:${ip}`] : [])];
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
      console.warn('[auth.forgot] captcha_failed', { requestId, path, reason: captcha.reason });
      return NextResponse.json(
        {
          message: 'Verificacao de seguranca falhou. Recarregue a pagina e tente novamente.',
          error: apiError({ code: '400', message: 'captcha_failed', details: captcha.reason }),
        },
        { status: 400 }
      );
    }

    for (const key of keys) recordLoginFailure(key);

    try {
      const token = randomBytes(32).toString('base64url');
      const expiresInMinutes = resolveTtl(options.expiresInMinutes);

      const rpcRes = await pgrstRpc(
        'fun_auth__password_reset_request',
        { p_login: email, p_token_hash: sha256(token), p_ttl_minutes: expiresInMinutes },
        { auth: purposeAuthHeader(), schema: 'auth' }
      );

      if (!rpcRes.ok) {
        const details = await rpcRes.text().catch(() => '');
        console.error('[auth.forgot] rpc_failed', {
          requestId,
          path,
          email: emailMasked,
          postgrestStatus: rpcRes.status,
          details,
        });
        return NextResponse.json(
          { message: 'Nao foi possivel processar o pedido agora. Tente mais tarde.' },
          { status: 500 }
        );
      }

      const exists = (await rpcRes.json().catch(() => false)) === true;
      if (!exists) {
        console.info('[auth.forgot] unknown_or_inactive', { requestId, path, email: emailMasked });
        return NextResponse.json({ message: GENERIC_OK_MESSAGE });
      }

      const resetUrl = `${resolveAppUrl(request)}${resetPath}?token=${encodeURIComponent(token)}`;
      const appName = process.env.APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Kizuna';

      try {
        await sendEmail({
          to: email,
          template: buildEmail({ email, resetUrl, expiresInMinutes, appName }),
        });
      } catch (error) {
        console.error('[auth.forgot] email_failed', {
          requestId,
          path,
          email: emailMasked,
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
          { message: 'Nao foi possivel enviar o email agora. Tente mais tarde.' },
          { status: 503 }
        );
      }

      console.info('[auth.forgot] sent', { requestId, path, email: emailMasked });
      return NextResponse.json({ message: GENERIC_OK_MESSAGE });
    } catch (error) {
      console.error('[auth.forgot] unexpected_error', {
        requestId,
        path,
        email: emailMasked,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { message: 'Erro inesperado. Tente novamente mais tarde.' },
        { status: 500 }
      );
    }
  };
}

/** `POST /api/auth/reset-password` — `{ token, password }`. */
export function createResetPasswordHandler(pgrstRpc: PgrstRpc) {
  return async function handleResetPassword(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const path = new URL(request.url).pathname;

    let body: ResetPasswordRequestBody;
    try {
      body = (await request.json()) as ResetPasswordRequestBody;
    } catch {
      return NextResponse.json({ message: 'Corpo da requisicao invalido.' }, { status: 400 });
    }

    const token = body.token?.trim() ?? '';
    const password = body.password?.trim() ?? '';

    if (!token) {
      return NextResponse.json({ message: 'Link invalido.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'A senha deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    const ipKey = ip ? `reset-confirm-ip:${ip}` : null;
    if (ipKey) {
      const lock = checkLockout(ipKey);
      if (lock.locked) {
        return NextResponse.json(
          { message: 'Muitas tentativas. Aguarde um pouco e tente de novo.' },
          { status: 429, headers: { 'Retry-After': String(lock.retryAfterSec) } }
        );
      }
    }

    try {
      const rpcRes = await pgrstRpc(
        'fun_auth__password_reset_confirm',
        { p_token_hash: sha256(token), p_password: password },
        { auth: purposeAuthHeader(), schema: 'auth' }
      );

      if (!rpcRes.ok) {
        const details = await rpcRes.text().catch(() => '');
        console.error('[auth.reset] rpc_failed', {
          requestId,
          path,
          postgrestStatus: rpcRes.status,
          details,
        });
        return NextResponse.json(
          { message: 'Nao foi possivel redefinir a senha agora. Tente mais tarde.' },
          { status: 500 }
        );
      }

      const ok = (await rpcRes.json().catch(() => false)) === true;
      if (!ok) {
        if (ipKey) recordLoginFailure(ipKey);
        return NextResponse.json(
          {
            message: 'Link invalido ou expirado. Peca um novo link de redefinicao.',
            error: apiError({ code: '400', message: 'invalid_or_expired_token' }),
          },
          { status: 400 }
        );
      }

      console.info('[auth.reset] success', { requestId, path });
      return NextResponse.json({ message: 'Senha redefinida. Voce ja pode entrar.' });
    } catch (error) {
      console.error('[auth.reset] unexpected_error', {
        requestId,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { message: 'Erro inesperado. Tente novamente mais tarde.' },
        { status: 500 }
      );
    }
  };
}
