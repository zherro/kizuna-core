import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
import { MascotAvatar } from './avatars/avatar';
/**
 * Cenas conhecidas por chave, para reuso rapido em paginas do painel
 * (`<SectionIllustration sceneKey="meus-servicos" />`). Novas paginas podem
 * tanto registrar uma cena aqui quanto passar `scene` diretamente.
 */
export const PANEL_ILLUSTRATION_SCENES = {
    'meus-servicos': {
        message: 'Mostre o que você faz de melhor',
        character: 'dog',
        accessories: [
            { key: 'wrench', x: -28, y: 6 },
            { key: 'sparkle', x: 28, y: -22, scale: 0.7 },
        ],
    },
    'meus-servicos-grupo': {
        message: 'Em qual área você trabalha?',
        character: 'technician',
        accessories: [{ key: 'magnifier', x: -28, y: 6 }],
    },
    'meus-servicos-categoria': {
        message: 'Qual a sua especialidade?',
        character: 'technician',
        accessories: [{ key: 'clipboard', x: -28, y: 6 }],
    },
    'meus-servicos-subcategoria': {
        message: 'Marque tudo que você faz',
        character: 'technician',
        accessories: [{ key: 'checklist', x: -28, y: 6 }],
    },
    'meus-servicos-titulo': {
        message: 'Falta pouco — de um título ao seu serviço',
        character: 'technician',
        accessories: [{ key: 'sparkle', x: 28, y: -20, scale: 0.8 }],
    },
    'meus-servicos-revisao': {
        message: 'Prontinho! Seu serviço foi salvo',
        character: 'dog',
        accessories: [{ key: 'star', x: 28, y: -20 }],
    },
};
/**
 * Balao de mensagem + mascote animado, usado no topo de paginas do painel
 * para dar contexto/boas-vindas. Generico: aceita uma cena inline (`scene`)
 * ou uma chave registrada em `PANEL_ILLUSTRATION_SCENES` (`sceneKey`).
 */
export function SectionIllustration({ scene, sceneKey, className, }) {
    const resolved = scene ?? (sceneKey ? PANEL_ILLUSTRATION_SCENES[sceneKey] : undefined);
    if (!resolved)
        return null;
    return (_jsxs("div", { className: cn('relative mb-6 flex items-stretch gap-4 overflow-hidden rounded-2xl border border-border bg-primary/10 pl-4 pr-2 sm:pl-6', className), children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" }), _jsx("div", { className: "relative flex flex-1 items-center py-3", children: _jsx(Bubble, { text: resolved.message }) }), _jsx("div", { className: "relative flex shrink-0 items-end", children: _jsx(MascotAvatar, { character: resolved.character, accessories: resolved.accessories, className: "h-24 w-32 sm:h-28 sm:w-36" }) })] }));
}
function Bubble({ text }) {
    return (_jsxs("div", { className: "relative max-w-[70%] rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm", children: [text, _jsx("span", { "aria-hidden": true, className: "absolute -bottom-1.5 left-3 h-3 w-3 rotate-45 border-b border-border bg-background" })] }));
}
//# sourceMappingURL=section-illustration.js.map