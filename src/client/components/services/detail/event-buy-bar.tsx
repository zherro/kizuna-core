'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Ticket } from 'lucide-react';
import { TrackedContactLink } from '../../../analytics/ad-tracking';
import type { EventBuyAction } from './event-buy';

const ACTION_LABEL: Record<EventBuyAction['channel'], string> = {
  purchase: 'Comprar ingresso',
  whatsapp: 'Chamar no WhatsApp',
};

function ActionIcon({ channel, className }: { channel: EventBuyAction['channel']; className: string }) {
  return channel === 'purchase' ? <Ticket aria-hidden className={className} /> : <MessageCircle aria-hidden className={className} />;
}

/**
 * Barra fixa de compra do evento no celular/tablet (some no `lg`, onde a sidebar já tem o botão).
 * Fica sobre a barra de abas (`--mobile-tab-h`); preço "a partir de" à esquerda, ação principal
 * (comprar ou WhatsApp) e, havendo as duas, o WhatsApp como botão-ícone secundário.
 *
 * Renderiza também um espaçador no fim do conteúdo do evento: reserva a altura da barra e, quando ele
 * entra na tela (fim do evento: daí para baixo vêm relacionados, publicidade e rodapé), a barra sai —
 * assim ela nunca fica por cima do AdSlot nem do rodapé. Sem JS a barra fica visível.
 */
export function EventBuyBar({
  primary,
  secondary,
  priceCaption,
  priceAmount,
}: {
  primary: EventBuyAction;
  secondary?: EventBuyAction | null;
  /** "A partir de" (ou null, ex. "Gratuito"). */
  priceCaption?: string | null;
  /** "R$ 100,00" / "Gratuito"; null = sem preço na barra. */
  priceAmount?: string | null;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  useEffect(() => {
    const end = endRef.current;
    if (!end || typeof IntersectionObserver === 'undefined') return;
    const o = new IntersectionObserver(([e]) =>
      // Na tela, ou já acima dela: nos dois casos o conteúdo do evento acabou.
      setReachedEnd(e.isIntersecting || e.boundingClientRect.top < 0)
    );
    o.observe(end);
    return () => o.disconnect();
  }, []);

  const linkProps = (a: EventBuyAction) => ({ channel: a.channel, href: a.href, target: '_blank', rel: 'noopener noreferrer' });

  return (
    <>
      <div ref={endRef} aria-hidden className="h-20 lg:hidden" data-event-buy-bar-end />
      <div
        role="region"
        aria-label="Comprar ingresso"
        aria-hidden={reachedEnd || undefined}
        inert={reachedEnd || undefined}
        className={`fixed inset-x-0 bottom-[var(--mobile-tab-h,0px)] z-30 border-t border-border bg-background/95 px-4 pt-2.5 pb-[max(0.625rem,calc(env(safe-area-inset-bottom)_+_0.625rem_-_var(--mobile-tab-h,0px)))] backdrop-blur md:bottom-0 md:pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden motion-safe:transition motion-safe:duration-200 ${
          reachedEnd ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {priceAmount && (
            <div className="min-w-0 flex-1 leading-tight">
              {priceCaption && <div className="text-xs text-muted-foreground">{priceCaption}</div>}
              <div className="truncate text-lg font-black tracking-tight text-brand tabular-nums">{priceAmount}</div>
            </div>
          )}
          <div className={`flex shrink-0 items-center gap-2 ${priceAmount ? '' : 'flex-1'}`}>
            {secondary && (
              <TrackedContactLink
                {...linkProps(secondary)}
                aria-label={ACTION_LABEL[secondary.channel]}
                title={ACTION_LABEL[secondary.channel]}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <ActionIcon channel={secondary.channel} className="h-5 w-5" />
              </TrackedContactLink>
            )}
            <TrackedContactLink
              {...linkProps(primary)}
              className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-bold text-brand-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                priceAmount ? '' : 'flex-1'
              }`}
            >
              <ActionIcon channel={primary.channel} className="h-4 w-4" />
              {ACTION_LABEL[primary.channel]}
            </TrackedContactLink>
          </div>
        </div>
      </div>
    </>
  );
}
