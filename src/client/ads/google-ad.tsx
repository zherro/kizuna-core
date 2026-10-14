'use client';
import { useEffect, useRef } from 'react';

const SCRIPT_ID = 'kizuna-adsbygoogle';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function ensureScript(client: string) {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

/** Unidade AdSense responsiva. Sem clique rastreável (o iframe é do Google). */
export function GoogleAd({ client, adUnit }: { client: string; adUnit: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      ensureScript(client);
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* bloqueador de anúncios etc. */
    }
  }, [client, adUnit]);

  return (
    <ins
      className="adsbygoogle block w-full"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={adUnit}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
