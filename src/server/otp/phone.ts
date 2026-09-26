/**
 * Normaliza um celular brasileiro para E.164 (+55DDXXXXXXXXX). Aceita com ou sem +55, com
 * máscara, espaços e zero de operadora. Só celular (9 dígitos começando com 9): é para onde o
 * código vai. Retorna null se não for um celular BR válido.
 */
export function normalizeBrMobile(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D+/g, '');
  // 00 = discagem internacional: só aceita se for para o Brasil (0055...).
  if (digits.startsWith('0055')) digits = digits.slice(2);
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  else if (digits.length === 12 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 11) return null;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99 || digits[2] !== '9') return null;
  return `+55${digits}`;
}

/** +5565999998888 → (65) 9****-8888 — para logs e telas de confirmação. */
export function maskPhone(e164: string): string {
  const d = e164.replace(/^\+55/, '');
  if (d.length !== 11) return '***';
  return `(${d.slice(0, 2)}) ${d[2]}****-${d.slice(7)}`;
}
