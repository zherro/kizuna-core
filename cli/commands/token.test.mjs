import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { signServiceToken } from './token.mjs';

const SECRET = 'segredo-de-teste-com-32-caracteres!!';

describe('signServiceToken', () => {
  it('assina { role: service_role } com o segredo, sem expiração', () => {
    const payload = jwt.verify(signServiceToken(SECRET), SECRET);
    expect(payload.role).toBe('service_role');
    expect(payload.exp).toBeUndefined();
  });

  it('recusa segredo vazio', () => {
    expect(() => signServiceToken('')).toThrow(/PGRST_JWT_SECRET/);
  });
});
