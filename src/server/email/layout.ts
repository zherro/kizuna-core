import type { EmailTemplate } from './index';

/**
 * Layout padrão dos e-mails do core (recuperar senha, verificar e-mail…). HTML de tabela com
 * estilo inline — o que Gmail/Outlook/celular renderizam igual — e a versão texto junto.
 * Cor do botão: `EMAIL_BRAND_COLOR` (hex) ou `accentColor`; padrão azul.
 */
export type EmailLayoutInput = {
  appName: string;
  subject: string;
  /** Título grande do corpo. */
  title: string;
  /** Parágrafos antes do botão (texto puro; é escapado). */
  intro: string[];
  /** Botão principal. */
  action?: { label: string; url: string };
  /** Código em destaque (ex.: 6 dígitos), para quem prefere digitar. */
  code?: { label: string; value: string };
  /** Linhas menores no fim (validade, "se não foi você…"). */
  notes?: string[];
  accentColor?: string;
};

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}

function accent(input?: string): string {
  const color = input || process.env.EMAIL_BRAND_COLOR || '#2563eb';
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : '#2563eb';
}

export function renderEmailLayout(input: EmailLayoutInput): EmailTemplate {
  const color = accent(input.accentColor);
  const app = escapeHtml(input.appName);
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(text)}</p>`;
  const small = (text: string) =>
    `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6b7280">${escapeHtml(text)}</p>`;

  const button = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:10px;background:${color}">` +
      `<a href="${escapeHtml(input.action.url)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(input.action.label)}</a>` +
      `</td></tr></table>`
    : '';

  const code = input.code
    ? `<p style="margin:8px 0 6px;font-size:13px;color:#6b7280">${escapeHtml(input.code.label)}</p>` +
      `<p style="margin:0 0 20px;font-size:30px;font-weight:700;letter-spacing:8px;color:#111827;font-family:ui-monospace,Menlo,Consolas,monospace">${escapeHtml(input.code.value)}</p>`
    : '';

  const fallback = input.action
    ? small('Se o botão não funcionar, copie e cole este endereço no navegador:') +
      `<p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:${color};word-break:break-all">${escapeHtml(input.action.url)}</p>`
    : '';

  const html =
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>` +
    `<body style="margin:0;padding:0;background:#f3f4f6">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif">` +
    `<tr><td style="height:6px;background:${color}"></td></tr>` +
    `<tr><td style="padding:28px 32px 8px;font-size:18px;font-weight:700;color:${color}">${app}</td></tr>` +
    `<tr><td style="padding:8px 32px 28px">` +
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827">${escapeHtml(input.title)}</h1>` +
    input.intro.map(p).join('') +
    button +
    code +
    fallback +
    (input.notes ?? []).map(small).join('') +
    `</td></tr>` +
    `<tr><td style="padding:16px 32px;background:#f9fafb;font-size:12px;color:#9ca3af">E-mail automático de ${app}. Não responda esta mensagem.</td></tr>` +
    `</table></td></tr></table></body></html>`;

  const text = [
    input.appName,
    '',
    input.title,
    '',
    ...input.intro,
    ...(input.action ? ['', `${input.action.label}: ${input.action.url}`] : []),
    ...(input.code ? ['', `${input.code.label} ${input.code.value}`] : []),
    ...(input.notes?.length ? ['', ...input.notes] : []),
  ].join('\n');

  return { subject: input.subject, text, html };
}
