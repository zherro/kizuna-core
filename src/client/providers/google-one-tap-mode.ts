'use client';

import { createContext, useContext } from 'react';

/**
 * Onde o Google One Tap aparece (prop `googleOneTap` do `AuthProvider`):
 * - `true` (padrão): só junto do formulário de login/cadastro (/login, /registre-se, modal de
 *   login). No celular o Google mostra um painel nativo que cobre a tela; ali a pessoa já veio
 *   para entrar, então ajuda em vez de atrapalhar.
 * - `'everywhere'`: em todo o site, para qualquer visitante anônimo.
 * - `false`: desligado.
 *
 * Fica fora do `auth-provider.tsx` para os formulários lerem o modo sem depender do provider
 * inteiro (os testes deles mockam o `useAuth`).
 */
export type GoogleOneTapMode = boolean | 'everywhere';

export const GoogleOneTapModeContext = createContext<GoogleOneTapMode>(true);

export function useGoogleOneTapMode(): GoogleOneTapMode {
  return useContext(GoogleOneTapModeContext);
}
