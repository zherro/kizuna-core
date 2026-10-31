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
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** `true` quando o captcha está configurado e não foi desligado pela flag. */
export function isCaptchaEnabled() {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!secret || !siteKey)
        return false;
    if (process.env.AUTH_CAPTCHA_ENABLED === 'false')
        return false;
    return true;
}
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
export async function verifyCaptcha(token, remoteIp) {
    if (!isCaptchaEnabled())
        return { ok: true };
    if (!token)
        return { ok: false, reason: 'missing' };
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret)
        return { ok: false, reason: 'config' };
    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token);
    if (remoteIp)
        body.set('remoteip', remoteIp);
    try {
        const res = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
            signal: AbortSignal.timeout(5000),
        });
        const data = (await res.json());
        return data.success ? { ok: true } : { ok: false, reason: 'invalid' };
    }
    catch (err) {
        console.warn('[captcha] verificação do Turnstile falhou; deixando passar (fail-open):', err);
        return { ok: true };
    }
}
//# sourceMappingURL=captcha.js.map