import { NextResponse } from 'next/server';
import { checkRateLimit } from '../ai/rate-limit';
import { verifyCaptcha } from '../captcha';
import { hasServiceAccess } from '../service-db';
import { createContactTicketAsService, validateContactInput } from './contact-ticket';

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60_000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || '';
}

/**
 * `POST /api/contact` — contato público (visitante). Corpo: `{ name, email, phone?, title,
 * description?, captchaToken?, website? }`. `website` é o honeypot: preenchido = robô (responde
 * 201 sem gravar). Freio por IP (5 por 10 min) e captcha Turnstile quando configurado. Quem está
 * logado usa `/api/resources/tickets`, não esta rota.
 */
export function createContactHandler() {
  return async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ message: 'Requisição inválida.' }, { status: 400 });

    if (String(body.website ?? '').trim() !== '') {
      return NextResponse.json({ item: { id: '0' } }, { status: 201 });
    }

    const ip = clientIp(request);
    if (!checkRateLimit(`contact:${ip || 'unknown'}`, MAX_PER_WINDOW, WINDOW_MS)) {
      return NextResponse.json(
        { message: 'Muitas mensagens em pouco tempo. Tente de novo em alguns minutos.' },
        { status: 429 }
      );
    }

    const captcha = await verifyCaptcha(
      typeof body.captchaToken === 'string' ? body.captchaToken : null,
      ip || null
    );
    if (!captcha.ok) {
      return NextResponse.json(
        { message: 'Verificação de segurança falhou. Recarregue a página e tente de novo.' },
        { status: 400 }
      );
    }

    const parsed = validateContactInput(body);
    if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 });

    if (!hasServiceAccess()) {
      return NextResponse.json({ message: 'Contato indisponível no momento.' }, { status: 503 });
    }

    try {
      const created = await createContactTicketAsService(parsed.value);
      if (!created) return NextResponse.json({ message: 'Contato indisponível.' }, { status: 503 });
      return NextResponse.json({ item: created }, { status: 201 });
    } catch (error) {
      console.error('[contact] create_failed', { error: String(error) });
      return NextResponse.json({ message: 'Não foi possível enviar agora.' }, { status: 500 });
    }
  };
}
