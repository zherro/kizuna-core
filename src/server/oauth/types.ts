/** Claims normalizadas que todo provedor devolve depois de trocar o `code`. */
export type OAuthProfile = {
  /** Id estável do usuário no provedor (`sub`). */
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export type OAuthAuthorizeInput = {
  redirectUri: string;
  state: string;
  codeChallenge: string;
  nonce: string;
};

export type OAuthExchangeInput = {
  code: string;
  redirectUri: string;
  codeVerifier: string;
  nonce: string;
};

/**
 * Porta de um provedor OAuth/OIDC. Adicionar Apple/Facebook = novo arquivo que implementa isto +
 * uma linha em `providers.ts`. O banco já é genérico (`auth.user_identities.provider`).
 */
export interface OAuthProvider {
  /** Slug gravado em `auth.user_identities.provider` e usado na rota (`/api/auth/oauth/<id>/...`). */
  id: string;
  label: string;
  /** false quando faltam envs — o botão não aparece e as rotas respondem 404. */
  isEnabled(): boolean;
  authorizeUrl(input: OAuthAuthorizeInput): string;
  exchange(input: OAuthExchangeInput): Promise<OAuthProfile>;
  /** Client id público para o login "One Tap" no navegador; null/ausente = provedor não tem. */
  oneTapClientId?(): string | null;
  /** Valida (com assinatura) um id_token recebido do navegador e devolve o perfil. */
  verifyIdToken?(idToken: string, expected: { nonce: string }): Promise<OAuthProfile>;
}
