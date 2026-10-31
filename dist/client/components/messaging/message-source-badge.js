'use client';
import { jsx as _jsx } from "react/jsx-runtime";
const LABEL = {
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    telegram: 'Telegram',
    email: 'E-mail',
};
/** Discreet origin tag — renders nothing for platform/system so a normal chat stays clean. */
export function MessageSourceBadge({ source }) {
    const label = LABEL[source];
    if (!label)
        return null;
    return (_jsx("span", { className: "mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground", children: label }));
}
//# sourceMappingURL=message-source-badge.js.map