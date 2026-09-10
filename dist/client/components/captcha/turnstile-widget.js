'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
function ensureScript() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined')
            return resolve();
        if (window.turnstile)
            return resolve();
        const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            // Se já carregou antes de anexarmos o listener.
            if (window.turnstile)
                resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.addEventListener('load', () => resolve(), { once: true });
        document.head.appendChild(script);
    });
}
export function TurnstileWidget({ onToken }) {
    const containerRef = useRef(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    useEffect(() => {
        if (!siteKey)
            return;
        let widgetId;
        let cancelled = false;
        ensureScript().then(() => {
            if (cancelled || !containerRef.current || !window.turnstile)
                return;
            widgetId = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                callback: (token) => onToken(token),
                'expired-callback': () => onToken(null),
                'error-callback': () => onToken(null),
            });
        });
        return () => {
            cancelled = true;
            if (widgetId && window.turnstile) {
                try {
                    window.turnstile.remove(widgetId);
                }
                catch {
                    /* widget já removido */
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [siteKey]);
    if (!siteKey)
        return null;
    return _jsx("div", { ref: containerRef, className: "my-1" });
}
//# sourceMappingURL=turnstile-widget.js.map