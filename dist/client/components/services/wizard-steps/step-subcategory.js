import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { ChipToggleList } from '../../ui-better-soft/lists/chip-toggle-list';
import { PorQueIsso } from './por-que-isso';
/**
 * Painel de especialidades ("tags") da categoria escolhida — usado dentro do passo Categoria.
 * Contador no título, chips num cartão destacado, explicação só no balão que encolhe.
 */
export function StepSubcategory({ subcategories, loading, category, value, onChange, }) {
    const filtered = subcategories
        .filter((subcategory) => String(subcategory.categoryId) === String(category?.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const count = value.filter((id) => filtered.some((s) => String(s.id) === String(id))).length;
    return (_jsxs("div", { className: "space-y-2.5", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [_jsxs("p", { className: "text-sm font-semibold text-foreground", children: ["Especialidades", count > 0 ? ` · ${count}` : ''] }), _jsx(PorQueIsso, { label: "Por qu\u00EA?", children: "Cada especialidade marcada \u00E9 mais uma busca em que o seu an\u00FAncio aparece. Marque s\u00F3 o que voc\u00EA realmente faz." })] }), !loading && filtered.length === 0 ? (_jsx("p", { className: "rounded-xl bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground", children: "Esta categoria n\u00E3o tem especialidades cadastradas. Voc\u00EA detalha no t\u00EDtulo e na descri\u00E7\u00E3o." })) : (_jsx("div", { className: "rounded-xl bg-muted/30 p-3", children: _jsx(ChipToggleList, { options: filtered.map((subcategory) => ({
                        id: String(subcategory.id),
                        label: subcategory.name,
                    })), value: value.map(String), onChange: onChange, accent: "primary" }) }))] }));
}
//# sourceMappingURL=step-subcategory.js.map