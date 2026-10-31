import { jsx as _jsx } from "react/jsx-runtime";
import { Topbar } from './topbar';
import { TopbarCompact } from './topbar-compact';
/**
 * Escolhe o cabeçalho do site. A variante é fixada pelo PROJETO — via a env
 * `KIZUNA_HEADER_VARIANT=classic|compact` (ou a prop `variant`), lida no
 * servidor no render. Sem toggle por usuário, sem cookie, sem estado client:
 * a escolha é estática, então a página pública continua prerenderizável.
 * Ambas as variantes são 100% tokenizadas (tema/cor afeta as duas igual).
 *
 * Uso (layout raiz):
 *   <KizunaHeader navLinks={[{ href: '/busca', label: 'Buscar' }]} />
 */
export function KizunaHeader({ variant, eyebrow, brandLabel, searchHref, ...topbarProps } = {}) {
    const resolved = variant ?? (process.env.KIZUNA_HEADER_VARIANT === 'compact' ? 'compact' : 'classic');
    if (resolved === 'compact') {
        return _jsx(TopbarCompact, { ...topbarProps, eyebrow: eyebrow, brandLabel: brandLabel, searchHref: searchHref });
    }
    return _jsx(Topbar, { ...topbarProps });
}
//# sourceMappingURL=kizuna-header.js.map