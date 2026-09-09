import type { ComponentType } from 'react';

export type WizardMode = 'create' | 'edit' | 'review';

export interface WizardEntities {
  [k: string]: unknown;
}

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
  persist: (overrides: Partial<S>) => Promise<{ ok: boolean }>;
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
  finishHrefByMode?: Partial<Record<WizardMode, string>>;
}
