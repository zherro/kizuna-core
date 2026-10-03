import { describe, expect, it, vi } from 'vitest';
import { createContactTicket, validateContactInput } from './contact-ticket';

const valid = {
  name: ' Maria ',
  email: ' Maria@Example.com ',
  phone: '',
  title: 'Dúvida sobre a plataforma',
  description: '',
};

describe('validateContactInput', () => {
  it('normaliza (trim, e-mail minúsculo)', () => {
    expect(validateContactInput(valid)).toEqual({
      ok: true,
      value: { ...valid, name: 'Maria', email: 'maria@example.com' },
    });
  });

  it.each([
    [{ ...valid, name: '' }],
    [{ ...valid, email: 'sem-arroba' }],
    [{ ...valid, title: 'ab' }],
    [{ ...valid, description: 'x'.repeat(4001) }],
  ])('rejeita entrada inválida (%#)', (input) => {
    expect(validateContactInput(input).ok).toBe(false);
  });
});

describe('createContactTicket', () => {
  it('grava como contato: e-mail dono, sem autor, nome e telefone', async () => {
    const table = vi.fn(async () => new Response(JSON.stringify([{ id: 12 }]), { status: 201 }));
    const id = await createContactTicket({ table, rpc: vi.fn() } as never, {
      name: 'Maria',
      email: 'maria@example.com',
      phone: '65 99999-0000',
      title: 'Oi',
      description: '',
    });
    expect(id).toMatchObject({ id: '12' });
    const [path, init] = table.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe('/tickets?select=id');
    expect(JSON.parse(String(init.body))).toMatchObject({
      type: 'contact',
      created_by: null,
      owner_email: 'maria@example.com',
      contact_name: 'Maria',
      contact_phone: '65 99999-0000',
      sla_due_at: id!.slaDueAt,
    });
  });

  it('plugin tickets ausente (404) → null', async () => {
    const table = vi.fn(async () => new Response('{}', { status: 404 }));
    expect(
      await createContactTicket({ table, rpc: vi.fn() } as never, {
        name: 'Maria',
        email: 'maria@example.com',
        phone: '',
        title: 'Oi!!',
        description: '',
      })
    ).toBeNull();
  });
});
