import type { ReactNode } from 'react';
import { LazyMount } from '../lazy-mount';

/**
 * Casca das telas de entrada (login e cadastro): explicações + ilustração à esquerda, formulário
 * "soft" à direita, sobre um círculo na cor do tema. No celular o formulário vem primeiro e as
 * explicações ficam abaixo. Ocupa toda a altura útil (`data-fill`, ver `<main>` em layout.tsx).
 * Server component.
 */
export function AuthSplit({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div data-fill className="relative isolate flex w-full flex-1 items-center overflow-hidden">
      {/*
        Círculo do tema em SVG do tamanho da área visível (antes era um div de 240vh, uma camada
        enorme fora da tela que pesava no paint). cx/cy/r via CSS: no celular fica no topo,
        no desktop é gigante com a borda direita atrás do formulário.
      */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full">
        <circle className="fill-primary/[0.06] [cx:50%] [cy:-4.5rem] [r:19rem] md:[cx:calc(min(50%_+_32rem,100%)_-_12rem_-_120vh)] md:[cy:50%] md:[r:120vh]" />
      </svg>
      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Arte decorativa: monta depois do formulário (ocioso + visível). */}
          <LazyMount className="order-2 md:order-1" minHeight={320}>
            {aside}
          </LazyMount>
          <div className="order-1 md:order-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
