'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Modo imersivo: uma tela de fluxo (wizard, onboarding) pede a tela inteira no mobile. Enquanto
 * alguém o segura, o `<html>` ganha `data-immersive`; o header do site, o do painel e a barra
 * inferior (`MobileTabBar`) somem abaixo de `md` e a tela desenha o próprio cabeçalho.
 * Contado por referência: duas telas montadas ao mesmo tempo não se desligam uma à outra.
 */
const ATTR = 'data-immersive';
let holders = 0;

export function useImmersiveMode(active = true) {
  useEffect(() => {
    if (!active) return;
    holders += 1;
    document.documentElement.setAttribute(ATTR, '');
    return () => {
      holders -= 1;
      if (holders === 0) document.documentElement.removeAttribute(ATTR);
    };
  }, [active]);
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] });
  return () => observer.disconnect();
}

/** true enquanto alguma tela segura o modo imersivo (sempre false no servidor). */
export function useIsImmersive(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.hasAttribute(ATTR),
    () => false
  );
}

/**
 * Classe para o que deve sumir no mobile em modo imersivo (headers do site e do painel).
 * Só CSS — some no mesmo frame em que o atributo entra, sem esperar render.
 */
export const HIDE_WHEN_IMMERSIVE = '[html[data-immersive]_&]:max-md:hidden';
