/**
 * How the wizard renders its steps. Orthogonal to `WizardMode` (create/edit/review) — that drives
 * business behaviour, this drives layout only.
 *
 * - `stepper`  — one step at a time, Voltar/Continuar (the classic `WizardShell`).
 * - `scroll`   — immersive vertical questionnaire: answered steps stay stacked and visible, the
 *                next step is revealed when the current one validates (`WizardScrollShell`).
 */
export type WizardLayout = 'stepper' | 'scroll';
export declare const WIZARD_LAYOUTS: readonly WizardLayout[];
export declare function isWizardLayout(value: unknown): value is WizardLayout;
/** localStorage key for the remembered layout choice, scoped per resource. */
export declare function layoutStorageKey(resource: string): string;
/**
 * Read the remembered layout for a resource. SSR-safe, tolerant of a poisoned/hand-edited value
 * (returns `null` so the caller keeps its own default).
 */
export declare function readStoredLayout(resource: string): WizardLayout | null;
export declare function writeStoredLayout(resource: string, layout: WizardLayout): void;
export interface WizardLayoutContextValue {
    layout: WizardLayout;
    /** true when steps are rendered stacked (scroll shell) — lets a step drop one-step-viewport chrome. */
    stacked: boolean;
}
export declare const WizardLayoutContext: import("react").Context<WizardLayoutContextValue>;
/**
 * Current wizard layout, for steps that need to adapt (e.g. suppress a modal-on-mount or a
 * redundant summary when stacked). Defaults to `stepper`/not-stacked outside any shell, so steps
 * rendered in tests or the showcase behave exactly as before.
 */
export declare function useWizardLayout(): WizardLayoutContextValue;
//# sourceMappingURL=wizard-layout.d.ts.map