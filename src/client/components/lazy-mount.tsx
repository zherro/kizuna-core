'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Monta `children` só quando o navegador fica ocioso E a área entra na tela. Para conteúdo
 * decorativo pesado (ex.: ilustrações SVG das telas de entrada) não disputar a CPU com o
 * conteúdo principal na navegação. `minHeight` reserva o espaço para não pular o layout.
 */
export function LazyMount({
  children,
  minHeight,
  className,
}: {
  children: ReactNode;
  minHeight?: number | string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let idleId: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
        idleId = ric(() => setShow(true), { timeout: 1500 } as IdleRequestOptions) as number;
      },
      { rootMargin: '200px' }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (idleId !== undefined) (window.cancelIdleCallback ?? window.clearTimeout)(idleId);
    };
  }, []);

  return (
    <div ref={ref} className={className} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
