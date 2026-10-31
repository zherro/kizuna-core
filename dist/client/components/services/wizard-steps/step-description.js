'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { QuillEditor } from '../../ui/quill-editor';
import { cn } from '../../../../lib/utils';
import { useWizardLayout } from '../../wizard/wizard-layout';
import { stripHtml } from '../service-type';
import { ServiceConfigSummary } from '../service-config-summary';
import { StepHeader } from './step-header';
import { StepHint } from './step-hint';
/** Mantido em sincronia com `canContinue` do step `description` no index.ts. */
export const DESCRIPTION_MIN_LENGTH = 20;
export function StepDescription({ state, patch, entities }) {
    const value = state.description ?? '';
    const length = stripHtml(value).length;
    const met = length >= DESCRIPTION_MIN_LENGTH;
    // In the stacked (scroll) layout every field the summary recaps is already visible above — drop
    // it to cut the redundant block and the extra scroll distance.
    const { stacked } = useWizardLayout();
    const groups = entities.groups ?? [];
    const categories = entities.categories ?? [];
    const subcategories = entities.subcategories ?? [];
    const selectedGroup = groups.find((g) => String(g.id) === String(state.groupId));
    const selectedCategory = categories.find((c) => String(c.id) === String(state.categoryId));
    const selectedSubcategoryNames = subcategories
        .filter((s) => state.subcategoryIds.includes(String(s.id)))
        .map((s) => s.name);
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Conte um pouco sobre o seu trabalho", subtitle: "Escreva com suas palavras: sua experi\u00EAncia, o que faz de diferente e como voc\u00EA atende.", why: "\u00C9 aqui que o cliente decide entre te chamar ou passar para o pr\u00F3ximo an\u00FAncio. Responder as d\u00FAvidas comuns (experi\u00EAncia, o que est\u00E1 incluso, prazo, garantia) evita idas e vindas no chat e traz contatos mais decididos." }), _jsx(QuillEditor, { value: value, onChange: (v) => patch({ description: v }), placeholder: "Ex.: Sou eletricista h\u00E1 12 anos, trabalho com instala\u00E7\u00F5es residenciais e prediais. Fa\u00E7o or\u00E7amento sem compromisso e ofere\u00E7o garantia de 90 dias no servi\u00E7o." }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-2 text-xs", children: [_jsx("span", { className: "text-muted-foreground", children: "Dica: experi\u00EAncia, regi\u00E3o atendida, o que est\u00E1 incluso, prazo e garantia." }), _jsxs("span", { className: cn('flex items-center gap-1 font-medium', met ? 'text-success' : 'text-muted-foreground'), children: [met ? _jsx(Check, { className: "h-3.5 w-3.5" }) : null, met
                                ? 'Mínimo atingido'
                                : `Mínimo de ${DESCRIPTION_MIN_LENGTH} caracteres (${length}/${DESCRIPTION_MIN_LENGTH})`] })] }), _jsx(StepHint, { tone: "tip", children: "Evite \u201Cfa\u00E7o de tudo\u201D. Ser espec\u00EDfico sobre o que voc\u00EA faz bem passa mais confian\u00E7a e atrai o cliente certo." }), stacked ? null : (_jsx(ServiceConfigSummary, { groupName: selectedGroup?.name, categoryName: selectedCategory?.name, subcategoryNames: selectedSubcategoryNames, title: state.title, serviceLocation: state.serviceLocation, startingPrice: state.startingPrice, priceUnit: state.priceUnit, imageIds: state.imageIds }))] }));
}
//# sourceMappingURL=step-description.js.map