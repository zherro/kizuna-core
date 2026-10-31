import { type WizardLayout } from './wizard-layout';
import type { WizardAssistant, WizardConfig, WizardConversationAdapter, WizardEntities, WizardMode } from './types';
export interface WizardProps<S extends Record<string, unknown> = Record<string, unknown>> {
    config: WizardConfig<S>;
    mode: WizardMode;
    entities: WizardEntities;
    initialResourceId: string | null;
    initialState?: S;
    /** Full resource record (edit/review) to hydrate the persister baseline before the first partial persist. */
    initialRecord?: Record<string, unknown>;
    modeLabels?: Partial<Record<WizardMode, string>>;
    assistant?: WizardAssistant | (() => WizardAssistant);
    /**
     * Conversational Naví (additive contract, `WizardConversation`). When present and not
     * `unavailable`, the wizard renders the assisted layer (dock + panel) and the one-shot
     * `assistant` button is suppressed. `create`-only by convention (the app decides).
     */
    conversation?: WizardConversationAdapter | (() => WizardConversationAdapter);
    onExit?: () => void;
    /**
     * Initial step layout. The header toggle can switch it live and the choice is remembered per
     * resource in localStorage. The `scroll` (immersive questionnaire) layout applies to `create`
     * only — `edit`/`review` always use the `stepper`. Defaults to `'stepper'`.
     */
    variant?: WizardLayout;
}
export declare function Wizard<S extends Record<string, unknown> = Record<string, unknown>>({ config, mode, entities, initialResourceId, initialState, initialRecord, modeLabels, assistant, conversation, onExit, variant, }: WizardProps<S>): import("react/jsx-runtime").JSX.Element;
export default Wizard;
//# sourceMappingURL=wizard.d.ts.map