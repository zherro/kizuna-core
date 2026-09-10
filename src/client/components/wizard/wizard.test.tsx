// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const submitResourceMock = vi.fn(async () => ({
  ok: true as const,
  data: { item: { id: '1' } },
}));
vi.mock('../../../lib/resource-submit', () => ({
  submitResource: (...args: unknown[]) => submitResourceMock(...args),
}));

import { defineWizard } from './define-wizard';
import { Wizard } from './wizard';

afterEach(() => {
  cleanup();
  submitResourceMock.mockClear();
});

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

  it('passa o ctx real do hook para o step — persist não é o stub', async () => {
    const persistCfg = defineWizard({
      resource: 'x',
      steps: ['a'],
      registry: {
        a: {
          key: 'a',
          label: 'Passo A',
          Component: (props: { persist: (o: Record<string, unknown>) => unknown }) => (
            <button type="button" onClick={() => void props.persist({ x: 1 })}>
              salvar
            </button>
          ),
        },
      },
    });
    render(
      <Wizard config={persistCfg} mode="create" entities={{}} initialResourceId={null} />
    );
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(submitResourceMock).toHaveBeenCalled();
  });
});
