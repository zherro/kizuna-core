import type { WizardConfig, WizardStep, WizardStepContext } from './types';

export function resolveSteps<S>(config: WizardConfig<S>, ctx: WizardStepContext<S>): WizardStep<S>[] {
  const registry = config.registry ?? {};
  const disabled = new Set(config.disable ?? []);

  // 1) materializa (string -> registry), separando os que têm âncora
  const anchored: Array<{ step: WizardStep<S>; after?: string; before?: string }> = [];
  const list: WizardStep<S>[] = [];
  for (const s of config.steps) {
    const step = typeof s === 'string' ? registry[s] : (s as WizardStep<S>);
    if (!step) throw new Error(`resolveSteps: step "${String(s)}" não está no registry`);
    if (disabled.has(step.key)) continue;
    const a = (s as { after?: string }).after;
    const b = (s as { before?: string }).before;
    if (a || b) anchored.push({ step, after: a, before: b });
    else list.push(step);
  }

  // 2) insere os ancorados
  for (const { step, after, before } of anchored) {
    const anchorKey = after ?? before!;
    const idx = list.findIndex((x) => x.key === anchorKey);
    if (idx === -1) {
      list.push(step);
      continue;
    }
    list.splice(after ? idx + 1 : idx, 0, step);
  }

  // 3) avalia enabled
  return list.filter((step) => {
    if (step.enabled === undefined) return true;
    return typeof step.enabled === 'function' ? step.enabled(ctx) : step.enabled;
  });
}
