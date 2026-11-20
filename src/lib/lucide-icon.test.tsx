// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { Building2, HelpCircle, House, MapPin, PartyPopper, ThumbsUp } from 'lucide-react';
import { resolveLucideIcon } from './lucide-icon';

afterEach(cleanup);

describe('resolveLucideIcon — known icons', () => {
  it('returns the real lucide component for names stored in the database', () => {
    expect(resolveLucideIcon('PartyPopper')).toBe(PartyPopper);
    expect(resolveLucideIcon('Building2')).toBe(Building2);
    expect(resolveLucideIcon('House')).toBe(House);
    expect(resolveLucideIcon('MapPin')).toBe(MapPin);
  });

  it('accepts the Lucide-prefixed and Icon-suffixed spellings', () => {
    expect(resolveLucideIcon('LucideMapPin')).toBe(MapPin);
    expect(resolveLucideIcon('MapPinIcon')).toBe(MapPin);
    expect(resolveLucideIcon(' MapPin ')).toBe(MapPin);
  });

  it('ignores the fallback when the name is known', () => {
    expect(resolveLucideIcon('ThumbsUp', HelpCircle)).toBe(ThumbsUp);
  });

  it('renders on the server without suspending', () => {
    const Icon = resolveLucideIcon('PartyPopper')!;
    expect(renderToString(<Icon className="h-4 w-4" />)).toContain('lucide-party-popper');
  });
});

describe('resolveLucideIcon — empty and malformed names', () => {
  it('returns null without a fallback', () => {
    expect(resolveLucideIcon(null)).toBeNull();
    expect(resolveLucideIcon(undefined)).toBeNull();
    expect(resolveLucideIcon('')).toBeNull();
    expect(resolveLucideIcon('   ')).toBeNull();
    expect(resolveLucideIcon('<script>')).toBeNull();
    expect(resolveLucideIcon('two words')).toBeNull();
  });

  it('returns the fallback when given one', () => {
    expect(resolveLucideIcon(null, HelpCircle)).toBe(HelpCircle);
    expect(resolveLucideIcon('not an icon!', HelpCircle)).toBe(HelpCircle);
  });

  it('never resolves non-icon object keys', () => {
    expect(resolveLucideIcon('constructor')).not.toBe(Object);
    expect(resolveLucideIcon('toString')).not.toBe(Object.prototype.toString);
  });
});

describe('resolveLucideIcon — names outside the known list', () => {
  it('returns a stable component per name', () => {
    expect(resolveLucideIcon('Rocket')).toBe(resolveLucideIcon('Rocket'));
    expect(resolveLucideIcon('Rocket')).not.toBe(resolveLucideIcon('Rocket', HelpCircle));
  });

  it('loads a valid lucide icon on demand', async () => {
    const Icon = resolveLucideIcon('Rocket')!;
    const { container } = render(<Icon className="h-4 w-4" data-testid="icon" />);
    await waitFor(() => expect(container.querySelector('svg.lucide-rocket')).not.toBeNull());
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('h-4 w-4');
  });

  it('accepts kebab-case names too', async () => {
    const Icon = resolveLucideIcon('alarm-clock')!;
    const { container } = render(<Icon />);
    await waitFor(() => expect(container.querySelector('svg.lucide-alarm-clock')).not.toBeNull());
  });

  it('renders the fallback when lucide has no such icon', async () => {
    const Icon = resolveLucideIcon('NoSuchIconAnywhere', HelpCircle);
    const { container } = render(<Icon className="h-4 w-4" />);
    await waitFor(() => expect(container.querySelector('svg.lucide-circle-question-mark, svg.lucide-help-circle, svg.lucide-circle-help')).not.toBeNull());
  });

  it('renders nothing for an unknown name without fallback', async () => {
    const Icon = resolveLucideIcon('NoSuchIconAnywhere')!;
    const { container } = render(<Icon />);
    // Wait for the lazy module, then the placeholder box is gone and nothing replaces it.
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });
});

describe('lucide-icon module', () => {
  it('never imports the whole lucide-react package', () => {
    const src = readFileSync(join(__dirname, 'lucide-icon.ts'), 'utf8');
    expect(src).not.toMatch(/import\s+\*\s+as\s+\w+\s+from\s+['"]lucide-react['"]/);
    expect(src).not.toMatch(/\bicons\b\s*[,}][^;]*from\s+['"]lucide-react['"]/);
  });

  it('is not re-exported from the utils barrel', () => {
    const src = readFileSync(join(__dirname, 'utils', 'index.ts'), 'utf8');
    expect(src).not.toContain('lucide');
  });
});
