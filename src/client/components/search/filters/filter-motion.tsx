'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from 'react';
import { cn } from '../../../../lib/utils';

/**
 * Movimento do filtro da busca. Tudo via Web Animations API + utilitários Tailwind já comuns — não
 * depende de keyframes no CSS do projeto. `prefers-reduced-motion` desliga os efeitos por script
 * (e `motion-reduce:` cuida das transições CSS).
 */

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type EnterVariant = 'rise' | 'from-right' | 'from-left' | 'pop';

const ENTER_FRAMES: Record<EnterVariant, [Keyframe, Keyframe]> = {
  rise: [
    { opacity: 0, transform: 'translateY(6px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ],
  'from-right': [
    { opacity: 0, transform: 'translateX(14px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  'from-left': [
    { opacity: 0, transform: 'translateX(-14px)' },
    { opacity: 1, transform: 'translateX(0)' },
  ],
  pop: [
    { opacity: 0, transform: 'scale(0.85)' },
    { opacity: 1, transform: 'scale(1)' },
  ],
};

/**
 * Anima UMA vez quando o elemento entra. `animate={false}` entrega o elemento já "no lugar" (o que
 * existia no primeiro desenho não deve piscar; só o que aparece depois por ação do usuário).
 */
export function Enter({
  as,
  variant = 'rise',
  animate = true,
  duration = 200,
  className,
  children,
}: {
  as?: ElementType;
  variant?: EnterVariant;
  animate?: boolean;
  duration?: number;
  className?: string;
  children: ReactNode;
}) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!animate || !el || typeof el.animate !== 'function' || prefersReducedMotion()) return;
    el.animate(ENTER_FRAMES[variant], { duration, easing: EASE });
    // só na entrada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/**
 * Reordenação suave (FLIP): marque cada item com `data-flip-key` e ligue o `ref` ao contêiner.
 * Quando `orderKey` muda, quem mudou de lugar desliza do ponto antigo ao novo.
 */
export function useFlipList<T extends HTMLElement = HTMLDivElement>(orderKey: string) {
  const ref = useRef<T>(null);
  const positions = useRef(new Map<string, { x: number; y: number }>());
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduce = prefersReducedMotion();
    const next = new Map<string, { x: number; y: number }>();
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-flip-key]'));
    // Só desliza quando é a MESMA lista em outra ordem (marcar/desmarcar). Se entrou ou saiu item
    // (carregou dados, trocou de grupo), a lista é outra: nada de itens voando de longe.
    const prevPositions = positions.current;
    const sameMembers =
      prevPositions.size === nodes.length &&
      nodes.every((n) => prevPositions.has(n.dataset.flipKey as string));
    nodes.forEach((node) => {
      const key = node.dataset.flipKey as string;
      const pos = { x: node.offsetLeft, y: node.offsetTop };
      next.set(key, pos);
      const prev = prevPositions.get(key);
      if (!sameMembers || !prev || reduce || typeof node.animate !== 'function') return;
      const dx = prev.x - pos.x;
      const dy = prev.y - pos.y;
      if (dx === 0 && dy === 0) return;
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 240, easing: EASE }
      );
    });
    positions.current = next;
  }, [orderKey]);
  return ref;
}

/**
 * Recolhe/expande por `grid-template-rows` (mesmo recurso da busca). Fechado vira `inert`, então o
 * conteúdo escondido não recebe foco nem aparece pra leitor de tela.
 */
export function Collapse({
  open,
  className,
  children,
}: {
  open: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        '-mx-1 grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        className
      )}
      aria-hidden={!open}
      inert={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="px-1 py-0.5">{children}</div>
      </div>
    </div>
  );
}

/** Guarda o último valor "cheio" — deixa o conteúdo visível enquanto o `Collapse` fecha. */
export function useRetained<T>(value: T[]): T[] {
  const last = useRef<T[]>(value);
  if (value.length > 0) last.current = value;
  return value.length > 0 ? value : last.current;
}

/** `false` no primeiro desenho, `true` depois — pra não animar o que já estava na tela ao abrir. */
export function useMountedFlag(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}
