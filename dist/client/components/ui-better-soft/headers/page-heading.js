import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Typography } from '../../ui/typography';
import { activeTheme } from '../../../lib/ui-theme';
import { cn } from '../../../../lib/utils';
/**
 * Heading simples de topo de tela (saudação, sem ações) — diferente de `PageHeader`/
 * `AdminPageReader`, que são cabeçalhos de página de listagem/gestão com ações à direita.
 * Tamanho/peso do título vêm de `activeTheme`, resolvido por `NEXT_PUBLIC_UI_STYLE`.
 */
export function PageHeading({ eyebrow, title, description, className, }) {
    return (_jsxs("div", { className: className, children: [eyebrow ? _jsx("p", { className: "text-sm font-semibold text-muted-foreground", children: eyebrow }) : null, _jsx(Typography.H1, { weight: activeTheme.headingTitleWeight, size: activeTheme.headingTitleSize, className: cn('leading-[0.95]', eyebrow ? 'mt-1' : undefined), children: title }), description ? (_jsx("div", { className: "mt-2 text-base font-medium text-foreground/70", children: description })) : null] }));
}
//# sourceMappingURL=page-heading.js.map