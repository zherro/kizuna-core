'use client';
import { useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsBoosted } from './live-boosts';

export const BORA_INDICA_LABEL = 'Indicado pelo Bora';

export type BoraIndicaVariant = 'card' | 'detail';

/**
 * Brilho que cruza o selo. Web Animations API em vez de @keyframes: o core não carrega CSS próprio
 * (as cores e o tema vêm do projeto), e assim `prefers-reduced-motion` é decidido aqui, em código.
 */
function playSheen(el: HTMLElement | null) {
  if (!el || typeof el.animate !== 'function') return;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [{ transform: 'translateX(-130%) skewX(-20deg)' }, { transform: 'translateX(520%) skewX(-20deg)' }],
    { duration: 900, easing: 'ease-out' },
  );
}

const SIZE: Record<BoraIndicaVariant, { box: string; icon: string }> = {
  // Card: pequeno, vive no canto da capa e não pode cobrir título nem preço.
  card: { box: 'gap-1 px-2 py-1 text-[10px] tracking-[0.08em]', icon: 'h-3 w-3' },
  // Detalhe: maior, ao lado do título.
  detail: { box: 'gap-1.5 px-3 py-1.5 text-xs tracking-[0.1em] shadow-lg', icon: 'h-3.5 w-3.5' },
};

/**
 * O selo em si (sem decidir SE aparece). Carimbo levemente torto, gradiente quente derivado da cor
 * da marca do tema (`--brand` misturada com âmbar) e um brilho que passa uma vez ao montar e de novo
 * no hover. Use `BoraIndicaBadge` quando o estado vem do impulsionamento vigente.
 */
export function BoraIndicaSeal({ variant = 'card', className }: { variant?: BoraIndicaVariant; className?: string }) {
  const sheen = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const t = setTimeout(() => playSheen(sheen.current), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <span
      role="img"
      aria-label={BORA_INDICA_LABEL}
      title={BORA_INDICA_LABEL}
      data-bora-indica={variant}
      onMouseEnter={() => playSheen(sheen.current)}
      className={cn(
        'relative isolate inline-flex w-fit max-w-full -rotate-2 select-none items-center overflow-hidden whitespace-nowrap rounded-full font-black uppercase leading-none text-brand-foreground shadow-md ring-1 ring-white/50 [background-image:linear-gradient(115deg,var(--brand),color-mix(in_oklch,var(--brand)_65%,var(--color-amber-500)))]',
        SIZE[variant].box,
        className,
      )}
    >
      <Star aria-hidden="true" className={cn('shrink-0 fill-current', SIZE[variant].icon)} />
      <span aria-hidden="true">Bora Indica</span>
      <span
        ref={sheen}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        style={{ transform: 'translateX(-130%) skewX(-20deg)' }}
      />
    </span>
  );
}

/**
 * Selo BORA INDICA de um anúncio com impulsionamento vigente. O estado vem de `useIsBoosted`
 * (consulta direta, sem cache, no navegador): o HTML cacheado (ISR) nunca carrega o selo, e o
 * primeiro render é sempre vazio — sem divergência de hidratação.
 */
export function BoraIndicaBadge({
  serviceUid,
  variant = 'card',
  className,
}: {
  serviceUid?: string | null;
  variant?: BoraIndicaVariant;
  className?: string;
}) {
  const boosted = useIsBoosted(serviceUid);
  if (!boosted) return null;
  return <BoraIndicaSeal variant={variant} className={className} />;
}
