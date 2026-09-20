import { defineWizard } from './define-wizard';
import { isWizardLayout, type WizardLayout } from './wizard-layout';
import type { WizardConfig, WizardMode, WizardStep } from './types';

/**
 * Shape of one `wizards.<name>` entry in the project's `kizuna.config.json`. Pure data — steps
 * are referenced by key and resolved against a registry (components can't live in JSON).
 */
export interface WizardJsonConfig {
  resource: string;
  steps: string[];
  disable?: string[];
  /** Initial layout. Default `'stepper'`. */
  layout?: WizardLayout;
  /** Hides the layout toggle and pins the layout. Default `true`. */
  lockLayout?: boolean;
  /** `false` ⇒ no Naví / AI button: the consumer must not pass `assistant`/`conversation`. */
  assistant?: boolean;
  finishHrefByMode?: Partial<Record<WizardMode, string>>;
}

export interface WizardFromJson<S> {
  config: WizardConfig<S>;
  /** Spread onto `<Wizard>`: `variant` + `lockLayout`. */
  layoutProps: { variant: WizardLayout; lockLayout: boolean };
  /** When `false`, don't pass `assistant`/`conversation` to `<Wizard>`. */
  assistantEnabled: boolean;
}

/**
 * Builds a `WizardConfig` plus the `<Wizard>` layout/AI switches from a JSON entry. Throws on an
 * unknown step key or an invalid layout so a typo in `kizuna.config.json` fails loudly.
 */
export function createWizardFromJson<S>(
  json: WizardJsonConfig,
  registry: Record<string, WizardStep<S>>
): WizardFromJson<S> {
  if (!json || typeof json.resource !== 'string' || !Array.isArray(json.steps)) {
    throw new Error('createWizardFromJson: "resource" e "steps" são obrigatórios');
  }
  const unknown = [...json.steps, ...(json.disable ?? [])].filter((k) => !(k in registry));
  if (unknown.length) {
    throw new Error(`createWizardFromJson: step(s) fora do registry: ${unknown.join(', ')}`);
  }
  if (json.layout !== undefined && !isWizardLayout(json.layout)) {
    throw new Error(`createWizardFromJson: layout inválido "${String(json.layout)}"`);
  }

  const config = defineWizard<S>({
    resource: json.resource,
    steps: json.steps,
    registry,
    disable: json.disable,
    finishHrefByMode: json.finishHrefByMode,
  });

  return {
    config,
    layoutProps: { variant: json.layout ?? 'stepper', lockLayout: json.lockLayout ?? true },
    assistantEnabled: json.assistant ?? false,
  };
}
