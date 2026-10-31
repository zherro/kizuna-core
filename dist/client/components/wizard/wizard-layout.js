'use client';
import { createContext, useContext } from 'react';
export const WIZARD_LAYOUTS = ['stepper', 'scroll'];
export function isWizardLayout(value) {
    return typeof value === 'string' && WIZARD_LAYOUTS.includes(value);
}
/** localStorage key for the remembered layout choice, scoped per resource. */
export function layoutStorageKey(resource) {
    return `wizard:layout:${resource}`;
}
/**
 * Read the remembered layout for a resource. SSR-safe, tolerant of a poisoned/hand-edited value
 * (returns `null` so the caller keeps its own default).
 */
export function readStoredLayout(resource) {
    if (typeof window === 'undefined')
        return null;
    try {
        const raw = window.localStorage.getItem(layoutStorageKey(resource));
        return isWizardLayout(raw) ? raw : null;
    }
    catch {
        return null;
    }
}
export function writeStoredLayout(resource, layout) {
    if (typeof window === 'undefined')
        return;
    try {
        window.localStorage.setItem(layoutStorageKey(resource), layout);
    }
    catch {
        /* private mode / storage disabled — the choice just won't persist */
    }
}
const DEFAULT_LAYOUT_CONTEXT = { layout: 'stepper', stacked: false };
export const WizardLayoutContext = createContext(DEFAULT_LAYOUT_CONTEXT);
/**
 * Current wizard layout, for steps that need to adapt (e.g. suppress a modal-on-mount or a
 * redundant summary when stacked). Defaults to `stepper`/not-stacked outside any shell, so steps
 * rendered in tests or the showcase behave exactly as before.
 */
export function useWizardLayout() {
    return useContext(WizardLayoutContext);
}
//# sourceMappingURL=wizard-layout.js.map