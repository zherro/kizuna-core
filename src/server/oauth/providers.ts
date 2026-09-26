import { googleProvider } from './google';
import type { OAuthProvider } from './types';

/** Registro dos provedores OAuth. Provedor novo = implementar `OAuthProvider` e somar aqui. */
const PROVIDERS: Record<string, OAuthProvider> = {
  [googleProvider.id]: googleProvider,
};

/** Provedor habilitado (envs presentes) pelo slug, ou null. */
export function getOAuthProvider(id: string): OAuthProvider | null {
  const provider = PROVIDERS[id];
  return provider && provider.isEnabled() ? provider : null;
}

/** Provedores com envs configuradas — a UI mostra um botão para cada. */
export function listEnabledOAuthProviders(): Array<{ id: string; label: string }> {
  return Object.values(PROVIDERS)
    .filter((p) => p.isEnabled())
    .map((p) => ({ id: p.id, label: p.label }));
}
