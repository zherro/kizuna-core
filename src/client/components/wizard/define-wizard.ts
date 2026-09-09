import type { WizardConfig } from './types';

export function defineWizard<S>(config: WizardConfig<S>): WizardConfig<S> {
  const keys = new Set<string>();
  for (const s of config.steps) {
    const key = typeof s === 'string' ? s : s.key;
    if (keys.has(key)) throw new Error(`defineWizard: step duplicado "${key}"`);
    keys.add(key);
  }
  const known = new Set<string>([...keys, ...Object.keys(config.registry ?? {})]);
  for (const s of config.steps) {
    if (typeof s === 'string') continue;
    const anchor = (s as { after?: string; before?: string }).after ?? (s as { before?: string }).before;
    if (anchor && !known.has(anchor)) {
      throw new Error(`defineWizard: step "${s.key}" referencia âncora inexistente "${anchor}"`);
    }
  }
  return config;
}
