'use client';

import { createContext, useContext } from 'react';

/**
 * How the wizard renders its steps. Orthogonal to `WizardMode` (create/edit/review) — that drives
 * business behaviour, this drives layout only.
 *
 * - `stepper`  — one step at a time, Voltar/Continuar (the classic `WizardShell`).
 * - `scroll`   — immersive vertical questionnaire: answered steps stay stacked and visible, the
 *                next step is revealed when the current one validates (`WizardScrollShell`).
 */
export type WizardLayout = 'stepper' | 'scroll';

export const WIZARD_LAYOUTS: readonly WizardLayout[] = ['stepper', 'scroll'];

export function isWizardLayout(value: unknown): value is WizardLayout {
  return typeof value === 'string' && (WIZARD_LAYOUTS as readonly string[]).includes(value);
}

/** localStorage key for the remembered layout choice, scoped per resource. */
export function layoutStorageKey(resource: string): string {
  return `wizard:layout:${resource}`;
}

/**
 * Read the remembered layout for a resource. SSR-safe, tolerant of a poisoned/hand-edited value
 * (returns `null` so the caller keeps its own default).
 */
export function readStoredLayout(resource: string): WizardLayout | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(layoutStorageKey(resource));
    return isWizardLayout(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredLayout(resource: string, layout: WizardLayout): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(layoutStorageKey(resource), layout);
  } catch {
    /* private mode / storage disabled — the choice just won't persist */
  }
}

export interface WizardLayoutContextValue {
  layout: WizardLayout;
  /** true when steps are rendered stacked (scroll shell) — lets a step drop one-step-viewport chrome. */
  stacked: boolean;
}

const DEFAULT_LAYOUT_CONTEXT: WizardLayoutContextValue = { layout: 'stepper', stacked: false };

export const WizardLayoutContext = createContext<WizardLayoutContextValue>(DEFAULT_LAYOUT_CONTEXT);

/**
 * Current wizard layout, for steps that need to adapt (e.g. suppress a modal-on-mount or a
 * redundant summary when stacked). Defaults to `stepper`/not-stacked outside any shell, so steps
 * rendered in tests or the showcase behave exactly as before.
 */
export function useWizardLayout(): WizardLayoutContextValue {
  return useContext(WizardLayoutContext);
}
