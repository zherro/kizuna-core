/**
 * Container de página do screen-engine (largura, respiro lateral/vertical) — mesma fórmula
 * px-4/py-6/sm:px-6/lg:px-8 de /painel/agenda/feriados. Fica num módulo leve (sem o registry) para
 * telas client que não passam pelo `RenderScreen` (ex.: /painel/favoritos) usarem o mesmo container.
 */
export const SCREEN_CONTAINER_CLASS =
  'mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8';
