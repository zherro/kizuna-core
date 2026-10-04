/**
 * Verificação do e-mail da conta por código. Um projeto liga assim:
 * - src/app/api/account/email/request/route.ts → `export const POST = createEmailVerifyRequestHandler(pgrstRpc, { siteName })`
 * - src/app/api/account/email/verify/route.ts  → `export const POST = createEmailVerifyConfirmHandler(pgrstRpc)`
 *
 * Depende de `auth.fun_auth__email_code_create` / `auth.fun_auth__email_code_verify`
 * (sql/0119_email_verification.sql), que marcam `auth.users.email_verified_at` — o campo do nível
 * de conta "contato verificado". O e-mail sai por `sendEmail` (SMTP_* do .env); sem SMTP → 503.
 */

import { NextResponse } from 'next/server';
import { createHmac, randomInt, randomUUID } from 'node:crypto';
import { getSession, maskEmail } from './auth';
import { sendEmail, type EmailTemplate } from './email';
import { purposeAuthHeader } from './session-issue';

type PgrstRpc = (name: string, payload: any, opts?: any) => Promise<Response>;

const CODE_LENGTH = 6;
const TTL_SEC = 900;
const COOLDOWN_SEC = 60;

function hashEmailCode(userUid: string, code: string): string {
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
  return createHmac('sha256', secret).update(`email_verify:${userUid}:${code}`).digest('hex');
}

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function buildEmailVerificationEmail(input: {
  code: string;
  siteName: string;
  expiresInMin: number;
}): EmailTemplate {
  const { code, siteName, expiresInMin } = input;
  return {
    subject: `${code} é o seu código de verificação — ${siteName}`,
    text:
      `Seu código para confirmar o e-mail no ${siteName} é ${code}.\n\n` +
      `Ele vale por ${expiresInMin} minutos. Se não foi você que pediu, ignore esta mensagem.`,
    html:
      `<p>Seu código para confirmar o e-mail no <strong>${siteName}</strong> é:</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>` +
      `<p>Ele vale por ${expiresInMin} minutos. Se não foi você que pediu, ignore esta mensagem.</p>`,
  };
}

/** `POST` — envia um código para o e-mail da conta logada. */
export function createEmailVerifyRequestHandler(
  pgrstRpc: PgrstRpc,
  options: { siteName?: string } = {}
) {
  const siteName = options.siteName ?? 'nosso site';

  return async function POST(): Promise<Response> {
    const requestId = randomUUID();
    const session = await getSession();
    if (!session) return NextResponse.json({ message: 'Entre na sua conta.' }, { status: 401 });

    if (!smtpConfigured()) {
      console.error('[auth.email_verify] smtp_not_configured', { requestId });
      return NextResponse.json(
        { message: 'O envio de e-mail não está configurado. Tente mais tarde.' },
        { status: 503 }
      );
    }

    const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');

    try {
      const rpcRes = await pgrstRpc(
        'fun_auth__email_code_create',
        {
          p_user_uid: session.user_id,
          p_code_hash: hashEmailCode(session.user_id, code),
          p_ttl_sec: TTL_SEC,
          p_cooldown_sec: COOLDOWN_SEC,
        },
        { auth: purposeAuthHeader('email_verify'), schema: 'auth' }
      );
      const data = (await rpcRes.json().catch(() => null)) as Record<string, unknown> | null;

      if (!rpcRes.ok) {
        const message = String(data?.message ?? '');
        if (message.includes('email_cooldown')) {
          return NextResponse.json(
            { message: 'Aguarde um minuto antes de pedir outro código.' },
            { status: 429, headers: { 'Retry-After': String(COOLDOWN_SEC) } }
          );
        }
        if (message.includes('email_daily_limit')) {
          return NextResponse.json(
            { message: 'Limite de códigos atingido hoje. Tente amanhã.' },
            { status: 429 }
          );
        }
        console.error('[auth.email_verify] create_failed', { requestId, status: rpcRes.status, message });
        return NextResponse.json({ message: 'Não foi possível enviar o código agora.' }, { status: 500 });
      }

      const email = String(data?.email ?? '');
      if (data?.already_verified === true) {
        return NextResponse.json({ message: 'Seu e-mail já está verificado.', alreadyVerified: true });
      }

      await sendEmail({
        to: email,
        template: buildEmailVerificationEmail({ code, siteName, expiresInMin: TTL_SEC / 60 }),
      });

      return NextResponse.json({
        message: `Enviamos um código para ${maskEmail(email)}.`,
        email: maskEmail(email),
        cooldownSec: COOLDOWN_SEC,
      });
    } catch (error) {
      console.error('[auth.email_verify] request_failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ message: 'Não foi possível enviar o código agora.' }, { status: 500 });
    }
  };
}

const VERIFY_REASON_MESSAGE: Record<string, string> = {
  invalid: 'Código incorreto. Confira e tente de novo.',
  expired: 'Este código expirou. Peça um novo.',
  too_many_attempts: 'Muitas tentativas. Peça um novo código.',
  no_challenge: 'Peça um código antes de confirmar.',
};

/** `POST { code }` — confere o código e marca o e-mail da conta como verificado. */
export function createEmailVerifyConfirmHandler(pgrstRpc: PgrstRpc) {
  return async function POST(request: Request): Promise<Response> {
    const requestId = randomUUID();
    const session = await getSession();
    if (!session) return NextResponse.json({ message: 'Entre na sua conta.' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    const code = String(body?.code ?? '').replace(/\D/g, '');
    if (code.length !== CODE_LENGTH) {
      return NextResponse.json({ message: 'Informe os 6 dígitos do código.' }, { status: 400 });
    }

    try {
      const rpcRes = await pgrstRpc(
        'fun_auth__email_code_verify',
        { p_user_uid: session.user_id, p_code_hash: hashEmailCode(session.user_id, code) },
        { auth: purposeAuthHeader('email_verify'), schema: 'auth' }
      );
      const data = (await rpcRes.json().catch(() => null)) as { ok?: boolean; reason?: string } | null;
      if (!rpcRes.ok) {
        console.error('[auth.email_verify] verify_rpc_failed', { requestId, status: rpcRes.status });
        return NextResponse.json({ message: 'Não foi possível confirmar agora.' }, { status: 500 });
      }
      if (!data?.ok) {
        return NextResponse.json(
          { message: VERIFY_REASON_MESSAGE[data?.reason ?? 'invalid'] ?? VERIFY_REASON_MESSAGE.invalid },
          { status: 400 }
        );
      }
      return NextResponse.json({ message: 'E-mail verificado.', verified: true });
    } catch (error) {
      console.error('[auth.email_verify] verify_failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json({ message: 'Não foi possível confirmar agora.' }, { status: 500 });
    }
  };
}
