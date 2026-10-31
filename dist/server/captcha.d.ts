/**
 * Captcha (Cloudflare Turnstile) com flag de habilitar/desabilitar.
 *
 * Envs:
 * - `TURNSTILE_SECRET_KEY`            — server; usada na verificação (siteverify).
 * - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`  — client; usada para renderizar o widget.
 *                                       O Next injeta `NEXT_PUBLIC_*` também no bundle server,
 *                                       então dá para checá-la aqui.
 * - `AUTH_CAPTCHA_ENABLED`            — opcional; se `"false"`, força o captcha desligado
 *                                       mesmo com as duas keys presentes.
 *
 * Regra: captcha habilitado ⟺ `TURNSTILE_SECRET_KEY` presente
 *   E `NEXT_PUBLIC_TURNSTILE_SITE_KEY` presente
 *   E `AUTH_CAPTCHA_ENABLED !== "false"`.
 *
 * Sem as keys, o captcha simplesmente não existe (nem no server, nem na UI).
 */
/** `true` quando o captcha está configurado e não foi desligado pela flag. */
export declare function isCaptchaEnabled(): boolean;
export type VerifyCaptchaResult = {
    ok: true;
} | {
    ok: false;
    reason: 'missing' | 'invalid' | 'config';
};
/**
 * Verifica um token do Turnstile contra a API da Cloudflare.
 *
 * - Captcha desabilitado → `{ ok: true }` (no-op, deixa passar).
 * - Habilitado e sem token → `{ ok: false, reason: 'missing' }`.
 * - `success: true`  → `{ ok: true }`.
 * - `success: false` → `{ ok: false, reason: 'invalid' }`.
 * - Erro de rede/timeout → `{ ok: true }` (fail-open: instabilidade do Turnstile
 *   não pode derrubar login/registro; loga `console.warn`).
 */
export declare function verifyCaptcha(token: string | undefined | null, remoteIp?: string | null): Promise<VerifyCaptchaResult>;
//# sourceMappingURL=captcha.d.ts.map