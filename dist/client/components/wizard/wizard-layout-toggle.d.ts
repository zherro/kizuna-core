import type { WizardLayout } from './wizard-layout';
/**
 * Segmented control that switches the wizard between its two layouts. Presentational only — the
 * parent owns the value and its persistence. Active state rides on `data-active` (Tailwind
 * `border-*`/`ring-*` colour utilities are dead project-wide; `.wz-layout-toggle` styles it).
 */
export declare function WizardLayoutToggle({ value, onChange, className, }: {
    value: WizardLayout;
    onChange: (layout: WizardLayout) => void;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export default WizardLayoutToggle;
//# sourceMappingURL=wizard-layout-toggle.d.ts.map