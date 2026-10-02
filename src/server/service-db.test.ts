import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasServiceAccess, serviceTable, ServiceUnavailableError } from './service-db';

const ORIGINAL = process.env.POSTGREST_SERVICE_TOKEN;

beforeEach(() => {
  process.env.POSTGREST_SERVICE_TOKEN = 'tok';
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]', { status: 200 }))
  );
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.POSTGREST_SERVICE_TOKEN;
  else process.env.POSTGREST_SERVICE_TOKEN = ORIGINAL;
  vi.unstubAllGlobals();
});

describe('service-db', () => {
  it('sem token: hasServiceAccess false e serviceTable lança ServiceUnavailableError', async () => {
    delete process.env.POSTGREST_SERVICE_TOKEN;
    expect(hasServiceAccess()).toBe(false);
    await expect(serviceTable('/users')).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('envia o token de serviço e o schema pedido', async () => {
    await serviceTable('/users?select=uid', { schema: 'auth' });
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer tok');
    expect(headers.get('Accept-Profile')).toBe('auth');
    expect(headers.get('Content-Profile')).toBe('auth');
  });
});
