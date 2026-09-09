// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('../../../lib/resource-submit', () => ({
  submitResource: vi.fn(async () => ({ ok: true as const, data: { item: { id: '1' } } })),
}));

import { defineWizard } from './define-wizard';
import { Wizard } from './wizard';
import type { WizardAssistant, WizardStepProps } from './types';

afterEach(cleanup);

const StepView = (props: WizardStepProps) => (
  <p>{(props.state.title as string) ?? '(vazio)'}</p>
);

const cfg = defineWizard({
  resource: 'x',
  steps: ['a'],
  registry: {
    a: { key: 'a', label: 'Passo A', Component: StepView, assist: true },
  },
});

describe('<Wizard> assist affordance', () => {
  it('ready: clicar preenche state vazio via applyAssistPatch', async () => {
    const assistant: WizardAssistant = {
      status: 'ready',
      suggest: vi.fn(async () => ({ message: 'ok', needsMore: false, patch: { title: 'IA' } })),
    };
    render(
      <Wizard config={cfg} mode="create" entities={{}} initialResourceId={null} assistant={assistant} />
    );
    expect(screen.getByText('(vazio)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /preencher com ia/i }));
    await waitFor(() => expect(screen.getByText('IA')).toBeTruthy());
  });

  it('unavailable: nenhum botão de assist', () => {
    const assistant: WizardAssistant = {
      status: 'unavailable',
      suggest: vi.fn(),
    };
    render(
      <Wizard config={cfg} mode="create" entities={{}} initialResourceId={null} assistant={assistant} />
    );
    expect(screen.queryByRole('button', { name: /preencher com ia/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /tentar de novo/i })).toBeNull();
  });

  it('sem assistant: nenhum affordance', () => {
    render(<Wizard config={cfg} mode="create" entities={{}} initialResourceId={null} />);
    expect(screen.queryByRole('button', { name: /preencher com ia/i })).toBeNull();
  });

  it('ready: campo já preenchido não é sobrescrito', async () => {
    const assistant: WizardAssistant = {
      status: 'ready',
      suggest: vi.fn(async () => ({ message: 'ok', needsMore: false, patch: { title: 'IA' } })),
    };
    render(
      <Wizard
        config={cfg}
        mode="create"
        entities={{}}
        initialResourceId={null}
        initialState={{ title: 'Meu' }}
        assistant={assistant}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /preencher com ia/i }));
    await waitFor(() => expect((assistant.suggest as ReturnType<typeof vi.fn>)).toHaveBeenCalled());
    expect(screen.getByText('Meu')).toBeTruthy();
  });
});
