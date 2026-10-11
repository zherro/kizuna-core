/**
 * Verificação do e-mail da conta por código de 6 dígitos + link.
 *
 * - `createEmailCodeRequestHandler()` → `POST /api/onboarding/email/request-code`: gera o código,
 *   grava em `user_data.email_verification_code` e manda o e-mail (layout do core) com o código
 *   e um botão. O link é `<APP_URL>/verificar-email#t=<token>`: o token é o código + o id do
 *   usuário criptografados (`sealToken`), no `#` — não vai para log de servidor/proxy, e a página
 *   tira da URL ao abrir.
 * - `resolveEmailVerificationCode()` → o `verify-code` aceita `{ code }` (digitado) ou
 *   `{ token }` (do link); o token só vale para o usuário logado que o recebeu.
 */

import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { resolveAppUrl } from './app-url';
import { openToken, sealToken } from './app-crypto';
import { getSession, maskEmail } from './auth';
import { sendEmail, type EmailTemplate } from './email';
import { renderEmailLayout } from './email/layout';
import { pgrstTable } from './postrest/conn';

export const EMAIL_VERIFY_PURPOSE = 'email-verify';
const LINK_TTL_SECONDS = 24 * 60 * 60;

export type EmailVerificationEmailInput = { appName: string; code: string; url: string };

/** E-mail padrão com o código e o botão "Confirmar meu e-mail". */
export function buildEmailVerificationEmail({ appName, code, url }: EmailVerificationEmailInput): EmailTemplate {
  return renderEmailLayout({
    appName,
    subject: `${code} é o seu código de verificação — ${appName}`,
    title: 'Confirme o seu e-mail',
    intro: [
      `Falta pouco para confirmar o seu e-mail em ${appName}.`,
      'Toque no botão para confirmar agora — se precisar, a gente pede para você entrar e volta direto para cá.',
    ],
    action: { label: 'Confirmar meu e-mail', url },
    code: { label: 'Ou digite este código na tela de verificação:', value: code },
    notes: [
      'O link vale por 24 horas. Se pedir um código novo, este deixa de valer.',
      'Se não foi você, ignore este e-mail.',
    ],
  });
}

/** Link do e-mail: o código vai criptografado e amarrado ao usuário, no `#`. */
export function buildEmailVerificationUrl(appUrl: string, userId: string, code: string, path = '/verificar-email'): string {
  const token = sealToken(EMAIL_VERIFY_PURPOSE, { u: userId, c: code }, LINK_TTL_SECONDS);
  return `${appUrl}${path}#t=${token}`;
}

/** Código de 6 dígitos vindo do corpo: `{ code }` digitado ou `{ token }` do link (do próprio usuário). */
export function resolveEmailVerificationCode(body: unknown, userId: string): string | null {
  const input = (body ?? {}) as { code?: unknown; token?: unknown };
  if (typeof input.token === 'string' && input.token) {
    const data = openToken<{ u?: string; c?: string }>(EMAIL_VERIFY_PURPOSE, input.token);
    if (!data || data.u !== userId || !/^\d{6}$/.test(String(data.c ?? ''))) return null;
    return String(data.c);
  }
  const code = String(input.code ?? '').trim();
  return /^\d{6}$/.test(code) ? code : null;
}

export type EmailCodeRequestOptions = {
  /** Nome no assunto/corpo. Padrão: env `APP_NAME` ou "nosso site". */
  appName?: string;
  /** Rota pública que abre o link. Padrão `/verificar-email`. */
  linkPath?: string;
  /** Troca o e-mail padrão. */
  buildEmail?: (input: EmailVerificationEmailInput) => EmailTemplate;
};

/** `POST /api/onboarding/email/request-code` (exige login). */
export function createEmailCodeRequestHandler(options: EmailCodeRequestOptions = {}) {
  const buildEmail = options.buildEmail ?? buildEmailVerificationEmail;

  return async function handleEmailCodeRequest(request: Request): Promise<Response> {
    const session = await getSession();
    if (!session?.login) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const saved = await pgrstTable(
      '/user_data?on_conflict=user_id',
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ user_id: session.user_id, email_verification_code: code }),
      },
      { schema: 'public' }
    );
    if (!saved.ok) {
      console.error('[email.request-code] save_failed', saved.status, await saved.text());
      return NextResponse.json({ error: 'Nao foi possivel gerar o codigo.' }, { status: 500 });
    }

    const appName = options.appName || process.env.APP_NAME || 'nosso site';
    const url = buildEmailVerificationUrl(resolveAppUrl(request), session.user_id, code, options.linkPath);
    try {
      await sendEmail({ to: session.login, template: buildEmail({ appName, code, url }) });
    } catch (error) {
      console.error('[email.request-code] send_failed', error instanceof Error ? error.message : error);
      return NextResponse.json({ error: 'Nao foi possivel enviar o e-mail agora.' }, { status: 503 });
    }

    return NextResponse.json({ message: `Enviamos um código para ${maskEmail(session.login)}.` });
  };
}
