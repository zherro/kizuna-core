import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';

const sendEmail = vi.fn();
vi.mock('./email', () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));

import { createForgotPasswordHandler, createResetPasswordHandler } from './password-reset';
import { __resetLockout } from './login-lockout';

const SECRET = 'test-secret-with-enough-length-123456';

function req(path: string, body: unknown, ip = '9.9.9.9') {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

function rpcReturning(value: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(value), { status }));
}

beforeEach(() => {
  process.env.PGRST_JWT_SECRET = SECRET;
  process.env.APP_URL = 'https://app.example.com/';
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  sendEmail.mockReset();
  __resetLockout();
});

describe('createForgotPasswordHandler', () => {
  it('conta existente: grava hash, assina JWT com purpose e envia o link', async () => {
    const rpc = rpcReturning(true);
    const res = await createForgotPasswordHandler(rpc)(
      req('/api/auth/forgot-password', { email: ' User@Mail.com ' })
    );
    expect(res.status).toBe(200);

    const [name, payload, opts] = rpc.mock.calls[0] as unknown as [string, any, any];
    expect(name).toBe('fun_auth__password_reset_request');
    expect(payload.p_login).toBe('user@mail.com');
    expect(opts.schema).toBe('auth');
    const claims = jwt.verify(opts.auth.replace('Bearer ', ''), SECRET) as any;
    expect(claims.purpose).toBe('password_reset');

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const { to, template } = sendEmail.mock.calls[0]![0];
    expect(to).toBe('user@mail.com');
    const token = /token=([^\s"&]+)/.exec(template.text)![1]!;
    expect(template.text).toContain('https://app.example.com/redefinir-senha?token=');
    // o banco recebe só o SHA-256 do token enviado
    expect(payload.p_token_hash).toBe(
      createHash('sha256').update(decodeURIComponent(token)).digest('hex')
    );
  });

  it('conta inexistente: mesma resposta, sem e-mail', async () => {
    const ok = await createForgotPasswordHandler(rpcReturning(true))(
      req('/x', { email: 'a@b.com' }, '1.1.1.1')
    );
    const missing = await createForgotPasswordHandler(rpcReturning(false))(
      req('/x', { email: 'c@d.com' }, '2.2.2.2')
    );
    expect(missing.status).toBe(200);
    expect((await missing.json()).message).toBe((await ok.json()).message);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('email inválido → 400', async () => {
    const res = await createForgotPasswordHandler(rpcReturning(true))(req('/x', { email: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('throttle por email após pedidos repetidos → 429', async () => {
    const handler = createForgotPasswordHandler(rpcReturning(false));
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = await handler(req('/x', { email: 'spam@b.com' }, `3.3.3.${i}`));
    }
    expect(last!.status).toBe(429);
  });

  it('falha de SMTP → 503', async () => {
    sendEmail.mockRejectedValue(new Error('smtp down'));
    const res = await createForgotPasswordHandler(rpcReturning(true))(
      req('/x', { email: 'a@b.com' })
    );
    expect(res.status).toBe(503);
  });
});

describe('createResetPasswordHandler', () => {
  it('token válido → 200 e envia hash do token', async () => {
    const rpc = rpcReturning(true);
    const res = await createResetPasswordHandler(rpc)(
      req('/api/auth/reset-password', { token: 'abc', password: 'nova123' })
    );
    expect(res.status).toBe(200);
    const [name, payload] = rpc.mock.calls[0] as unknown as [string, any];
    expect(name).toBe('fun_auth__password_reset_confirm');
    expect(payload.p_token_hash).toBe(createHash('sha256').update('abc').digest('hex'));
    expect(payload.p_password).toBe('nova123');
  });

  it('token inválido/expirado → 400', async () => {
    const res = await createResetPasswordHandler(rpcReturning(false))(
      req('/x', { token: 'abc', password: 'nova123' })
    );
    expect(res.status).toBe(400);
  });

  it('senha curta → 400 sem chamar o banco', async () => {
    const rpc = rpcReturning(true);
    const res = await createResetPasswordHandler(rpc)(req('/x', { token: 'abc', password: '123' }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
