import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildEmailVerificationEmail,
  buildEmailVerificationUrl,
  resolveEmailVerificationCode,
} from './email-verification';

beforeEach(() => vi.stubEnv('PGRST_JWT_SECRET', 'segredo-de-teste-com-tamanho-suficiente'));
afterEach(() => vi.unstubAllEnvs());

describe('link de verificação', () => {
  it('código vai criptografado no # e só abre para o mesmo usuário', () => {
    const url = buildEmailVerificationUrl('https://site.test', 'user-1', '042517');
    expect(url.startsWith('https://site.test/verificar-email#t=')).toBe(true);
    expect(url).not.toContain('042517');
    const token = url.split('#t=')[1];
    expect(resolveEmailVerificationCode({ token }, 'user-1')).toBe('042517');
    expect(resolveEmailVerificationCode({ token }, 'outro-user')).toBeNull();
    expect(resolveEmailVerificationCode({ token: 'lixo' }, 'user-1')).toBeNull();
  });

  it('código digitado continua valendo', () => {
    expect(resolveEmailVerificationCode({ code: ' 123456 ' }, 'u')).toBe('123456');
    expect(resolveEmailVerificationCode({ code: '12a456' }, 'u')).toBeNull();
  });

  it('e-mail traz botão com o link e o código em destaque', () => {
    const url = buildEmailVerificationUrl('https://site.test', 'u', '111222');
    const email = buildEmailVerificationEmail({ appName: 'Bora <Cuiabá>', code: '111222', url });
    expect(email.subject).toContain('111222');
    expect(email.html).toContain('Confirmar meu e-mail');
    expect(email.html).toContain('111222');
    expect(email.html).toContain('Bora &lt;Cuiabá&gt;');
    expect(email.text).toContain(url);
  });
});
