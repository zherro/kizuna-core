/** Best-effort: sendBeacon (sobrevive a navegação) com fallback para fetch keepalive. */
export function postBeacon(url: string, body: string): void {
  try {
    if (
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
    ) {
      return;
    }
  } catch {
    /* cai no fetch */
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}
