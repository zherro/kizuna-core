'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Input } from '../../ui/input';
import { SERVICE_PRICE_UNIT_OPTIONS } from '../service-type';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';
/** Passo 4 — valor a partir de + forma de cobrança. Ambos opcionais ('sob orçamento' + R$ 0 é
 * válido), então `canContinue` deste passo é sempre `true`. */
export function StepPrice({ state, patch }) {
    const startingPrice = state.startingPrice ?? 0;
    const priceUnit = state.priceUnit ?? 'quote';
    const isQuote = priceUnit === 'quote';
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Quanto voc\u00EA cobra?", subtitle: "Um valor de refer\u00EAncia ajuda o cliente a decidir antes de te chamar. N\u00E3o precisa ser o pre\u00E7o final \u2014 \u00E9 o 'a partir de'.", why: "An\u00FAncios com um valor de refer\u00EAncia recebem contatos mais s\u00E9rios: quem chama j\u00E1 sabe a ordem de grandeza. Se o seu pre\u00E7o depende muito de cada caso, escolha 'sob or\u00E7amento' e combine o resto no chat." }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium text-foreground", children: "Como voc\u00EA cobra?" }), _jsx("div", { className: "grid grid-cols-1 gap-2.5 sm:grid-cols-2", children: SERVICE_PRICE_UNIT_OPTIONS.map((option) => {
                            const active = priceUnit === option.value;
                            return (_jsxs("button", { type: "button", onClick: () => patch({ priceUnit: option.value }), "data-active": active, className: "wz-selectable rounded-xl border bg-background p-3.5 text-left", children: [_jsx("div", { className: "text-sm font-semibold text-foreground", children: option.label }), _jsx("div", { className: "mt-0.5 text-xs text-muted-foreground", children: option.hint })] }, option.value));
                        }) })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { htmlFor: "starting-price", className: "block text-sm font-medium text-foreground", children: ["Valor a partir de ", isQuote ? '(opcional)' : '(R$)'] }), _jsx(Input, { id: "starting-price", type: "number", min: 0, step: "0.01", inputMode: "decimal", value: startingPrice || '', onChange: (event) => patch({ startingPrice: Number(event.target.value) || 0 }), placeholder: "0,00", className: "h-12 max-w-[12rem] text-base" }), isQuote ? (_jsx(StepHint, { tone: "info", children: "Com \u201Csob or\u00E7amento\u201D voc\u00EA pode deixar em branco. Se preencher, o cliente v\u00EA \u201Ca partir de R$ X\u201D." })) : null] })] }));
}
//# sourceMappingURL=step-price.js.map