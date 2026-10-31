// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  layoutStorageKey,
  readStoredLayout,
  writeStoredLayout,
  isWizardLayout,
} from './wizard-layout';

beforeEach(() => {
  window.localStorage.clear();
});

describe('wizard-layout storage', () => {
  it('scopes the key per resource', () => {
    expect(layoutStorageKey('services')).toBe('wizard:layout:services');
    expect(layoutStorageKey('ads')).toBe('wizard:layout:ads');
  });

  it('returns null when unset', () => {
    expect(readStoredLayout('services')).toBeNull();
  });

  it('round-trips a valid value', () => {
    writeStoredLayout('services', 'scroll');
    expect(readStoredLayout('services')).toBe('scroll');
    writeStoredLayout('services', 'stepper');
    expect(readStoredLayout('services')).toBe('stepper');
  });

  it('ignores a poisoned value', () => {
    window.localStorage.setItem(layoutStorageKey('services'), 'bogus');
    expect(readStoredLayout('services')).toBeNull();
  });

  it('does not leak between resources', () => {
    writeStoredLayout('services', 'scroll');
    expect(readStoredLayout('ads')).toBeNull();
  });

  it('validates the union', () => {
    expect(isWizardLayout('stepper')).toBe(true);
    expect(isWizardLayout('scroll')).toBe(true);
    expect(isWizardLayout('grid')).toBe(false);
    expect(isWizardLayout(null)).toBe(false);
  });
});
