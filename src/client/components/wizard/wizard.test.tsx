// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { defineWizard } from './define-wizard';
import { Wizard } from './wizard';

afterEach(cleanup);

const cfg = defineWizard({
  resource: 'x',
  steps: ['a', 'b'],
  registry: {
    a: { key: 'a', label: 'Passo A', Component: () => <p>conteudo A</p> },
    b: { key: 'b', label: 'Passo B', Component: () => <p>conteudo B</p> },
  },
});

describe('<Wizard>', () => {
  it('renderiza o primeiro step e o chrome, sem fullscreen', () => {
    const { container } = render(
      <Wizard config={cfg} mode="create" entities={{}} initialResourceId={null} />
    );
    expect(screen.queryByText('conteudo A')).not.toBeNull();
    expect(screen.queryByText('conteudo B')).toBeNull();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeTruthy();
    expect(container.querySelector('.fixed.inset-0')).toBeNull();
  });
});
