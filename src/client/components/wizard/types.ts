import type { ComponentType } from 'react';
import type { WizardConversationAdapter } from './conversation-types';

export * from './conversation-types';

export type WizardMode = 'create' | 'edit' | 'review';

export interface WizardEntities {
  [k: string]: unknown;
}

/**
 * Frozen contract — also implemented by the ai_assistant plugin (sibling subproject).
 * Do not change the shape.
 */
export interface WizardAssistant {
  suggest(input: { userText: string; state: Record<string, unknown>; stepKey: string }): Promise<{
    message: string;
    needsMore: boolean;
    patch: Record<string, unknown>;
  }>;
  status: 'ready' | 'degraded' | 'unavailable';
  retry?: () => void;
}

export interface WizardStepContext<S = Record<string, unknown>> {
  state: S;
  patch: (p: Partial<S>) => void;
  entities: WizardEntities;
  resourceId: string | number | null;
  mode: WizardMode;
  assist?: WizardAssistant;
  /** Persisting is a resource-payload operation — keys are resource column names, not state keys. */
  persist: (
    overrides: Record<string, unknown>
  ) => Promise<{ ok: boolean; item: Record<string, unknown> | null }>;
  /** Merge a partial object into the resource row's `extras` jsonb and save (read-merge-write). */
  persistExtras: (partialExtras: Record<string, unknown>) => Promise<{ ok: boolean }>;
  touched: ReadonlySet<keyof S>;
  /** O passo pede pra esconder a Naví agora (ex.: quer forçar seleção manual de um sub-campo
   *  antes de liberar o avanço). A engine some com o dock/fab enquanto isto for `true`. */
  setNaviSuppressed?: (v: boolean) => void;
}

export interface WizardStepProps<S = Record<string, unknown>> extends WizardStepContext<S> {}

export interface WizardStep<S = Record<string, unknown>> {
  key: string;
  label: string;
  Component: ComponentType<WizardStepProps<S>>;
  required?: boolean;
  enabled?: boolean | ((ctx: WizardStepContext<S>) => boolean);
  canContinue?: (ctx: WizardStepContext<S>) => boolean;
  persist?: (ctx: WizardStepContext<S>) => Promise<void>;
  assist?: boolean;
  /** Clicar numa tag de sugestão da Naví neste passo (não a multi-seleção, não "Pode seguir")
   *  já aplica a resposta E avança — sem round-trip extra só pra confirmar. Pensado pra passos
   *  de resposta única e já-decidida (ex.: escolher um dos títulos sugeridos). */
  conversationQuickConfirm?: boolean;
}

export type WizardStepInput<S = Record<string, unknown>> =
  | string
  | WizardStep<S>
  | (WizardStep<S> & { after?: string; before?: string });

export interface WizardConfig<S = Record<string, unknown>> {
  resource: string;
  mode?: WizardMode;
  steps: WizardStepInput<S>[];
  registry?: Record<string, WizardStep<S>>;
  disable?: string[];
  assistant?: WizardAssistant | (() => WizardAssistant);
  conversation?: WizardConversationAdapter | (() => WizardConversationAdapter);
  finishHrefByMode?: Partial<Record<WizardMode, string>>;
}
