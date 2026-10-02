const STORAGE_KEY = 'kz-vid';

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

function randomHex32(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

let memo: { day: string; id: string } | null = null;

/**
 * Id anônimo do visitante: aleatório, guardado no navegador e trocado a cada dia UTC — não
 * identifica ninguém e não cruza dias. Sem storage (modo privado), vale só na sessão.
 */
export function getVisitorId(now: Date = new Date()): string {
  const day = utcDay(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as { day?: string; id?: string };
      if (saved.day === day && /^[0-9a-f]{32}$/.test(saved.id ?? '')) return saved.id!;
    }
  } catch {
    /* segue para gerar */
  }
  if (memo?.day === day) return memo.id;
  const id = randomHex32();
  memo = { day, id };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ day, id }));
  } catch {
    /* fica só em memória */
  }
  return id;
}

const BOT_UA =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp\/|telegrambot|curl|wget|python-requests|okhttp/i;

/** Filtro best-effort de automação; robôs que executam JS e mentem no UA passam. */
export function isAutomated(
  nav: Pick<Navigator, 'webdriver' | 'userAgent'> = navigator
): boolean {
  return nav.webdriver === true || !nav.userAgent || BOT_UA.test(nav.userAgent);
}
