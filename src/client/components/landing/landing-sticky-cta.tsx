'use client';

import { useEffect, useState } from 'react';
import { WhatsAppButton } from './landing-ui';

/**
 * Botão fixo no rodapé do celular (some do tablet para cima). Fica sobre a barra de abas
 * (`--mobile-tab-h`) e se esconde quando o botão do hero está na tela e a partir do bloco final
 * (`endId`), para não duplicar o botão nem cobrir o rodapé. Sem JS, fica visível.
 */
export function LandingStickyCta({
  href,
  label = 'Falar no WhatsApp',
  heroId,
  endId,
}: {
  href: string;
  label?: string;
  /** id do elemento do hero cujo botão já está visível. */
  heroId: string;
  /** id do bloco final: ao chegar nele (ou passar), o botão fixo some. */
  endId: string;
}) {
  const [heroVisible, setHeroVisible] = useState(false);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const end = document.getElementById(endId);
    if (typeof IntersectionObserver === 'undefined') return;
    const observers: IntersectionObserver[] = [];
    if (hero) {
      const o = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting));
      o.observe(hero);
      observers.push(o);
    }
    if (end) {
      const o = new IntersectionObserver(([e]) =>
        // Visível, ou já ficou acima da tela (rodapé): nos dois casos o botão fixo sai.
        setReachedEnd(e.isIntersecting || e.boundingClientRect.top < 0)
      );
      o.observe(end);
      observers.push(o);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [heroId, endId]);

  const hidden = heroVisible || reachedEnd;
  return (
    <div
      aria-hidden={hidden || undefined}
      inert={hidden || undefined}
      className={`fixed inset-x-0 bottom-[var(--mobile-tab-h,0px)] z-30 border-t border-border bg-background/95 px-4 py-2.5 backdrop-blur md:hidden motion-safe:transition motion-safe:duration-200 ${
        hidden ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <WhatsAppButton href={href} label={label} className="w-full" />
    </div>
  );
}
