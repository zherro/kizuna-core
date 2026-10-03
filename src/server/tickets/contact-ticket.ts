import { slaDueAt } from '../../client/components/tickets/ticket-sla';
import { serviceDb, type ServiceDb } from '../service-db';

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  title: string;
  description: string;
};

export type ContactValidation =
  { ok: true; value: ContactInput } | { ok: false; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value: unknown) => String(value ?? '').trim();

/** Normaliza e valida o corpo do contato público (mesmos limites do CHECK da tabela). */
export function validateContactInput(raw: Record<string, unknown>): ContactValidation {
  const value: ContactInput = {
    name: text(raw.name),
    email: text(raw.email).toLowerCase(),
    phone: text(raw.phone),
    title: text(raw.title),
    description: text(raw.description),
  };
  if (value.name.length < 2 || value.name.length > 120) {
    return { ok: false, message: 'Informe seu nome.' };
  }
  if (!EMAIL_RE.test(value.email) || value.email.length > 254) {
    return { ok: false, message: 'Informe um e-mail válido.' };
  }
  if (value.phone.length > 40) return { ok: false, message: 'Telefone inválido.' };
  if (value.title.length < 3 || value.title.length > 160) {
    return { ok: false, message: 'O assunto precisa ter de 3 a 160 caracteres.' };
  }
  if (value.description.length > 4000) {
    return { ok: false, message: 'A mensagem pode ter até 4000 caracteres.' };
  }
  return { ok: true, value };
}

/**
 * Abre o chamado do contato público como `service_role` (visitante sem login não escreve direto
 * no banco). `owner_email` = e-mail informado — é a chave que liga o chamado ao dono; quem entrar
 * depois com esse e-mail passa a vê-lo. Devolve o id (número do chamado) e o prazo (SLA) ou `null` se o plugin
 * `tickets` não estiver instalado.
 */
export async function createContactTicket(
  db: ServiceDb,
  input: ContactInput
): Promise<{ id: string; slaDueAt: string } | null> {
  const dueAt = slaDueAt(input.title);
  const res = await db.table('/tickets?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      type: 'contact',
      title: input.title,
      description: input.description || null,
      created_by: null,
      owner_email: input.email,
      contact_name: input.name,
      contact_phone: input.phone || null,
      sla_due_at: dueAt,
    }),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PostgREST ${res.status}`);
  const [row] = (await res.json()) as { id: number | string }[];
  return row ? { id: String(row.id), slaDueAt: dueAt } : null;
}

export const createContactTicketAsService = (input: ContactInput) =>
  createContactTicket(serviceDb, input);
