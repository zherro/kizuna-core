// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';

const seen: Array<boolean | null | undefined> = [];
vi.mock('next/link', () => ({
  default: ({
    prefetch,
    href,
    children,
  }: {
    prefetch?: boolean | null;
    href: string;
    children: ReactNode;
  }) => {
    seen.push(prefetch);
    return <a href={href}>{children}</a>;
  },
}));

import { CardLink, LinkPrefetchProvider } from './link-prefetch';

afterEach(() => {
  cleanup();
  seen.length = 0;
});

describe('CardLink', () => {
  it('sem provider: padrão do Next (prefetch indefinido)', () => {
    render(<CardLink href="/a">a</CardLink>);
    expect(seen).toEqual([undefined]);
  });

  it('provider com cards={false}: desliga o prefetch', () => {
    render(
      <LinkPrefetchProvider cards={false}>
        <CardLink href="/a">a</CardLink>
      </LinkPrefetchProvider>
    );
    expect(seen).toEqual([false]);
  });

  it('prefetch explícito vence a política', () => {
    render(
      <LinkPrefetchProvider cards={false}>
        <CardLink href="/a" prefetch>
          a
        </CardLink>
      </LinkPrefetchProvider>
    );
    expect(seen).toEqual([true]);
  });
});
