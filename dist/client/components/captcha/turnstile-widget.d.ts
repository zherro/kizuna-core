/**
 * Widget do Cloudflare Turnstile.
 *
 * Sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, o componente renderiza `null` — o form
 * consumidor continua funcionando exatamente como hoje.
 *
 * `onToken` recebe o token quando o desafio é resolvido, e `null` quando o token
 * expira ou o widget dá erro.
 */
interface TurnstileApi {
    render: (el: HTMLElement, opts: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: () => void;
    }) => string;
    remove: (widgetId: string) => void;
}
declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}
export declare function TurnstileWidget({ onToken }: {
    onToken: (token: string | null) => void;
}): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=turnstile-widget.d.ts.map