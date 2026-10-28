// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));

const submitResourceMock = vi.fn(async () => ({
  ok: true as const,
  data: { item: { id: '1' } },
}));
vi.mock('../../../lib/resource-submit', () => ({
  submitResource: (...args: unknown[]) => submitResourceMock(...args),
}));

vi.mock('../../providers/app-preferences-provider', () => ({
  useAppPreferences: () => ({ messages: { wizard: { exitConfirm: 'Sair?' } } }),
}));

import { defineWizard } from './define-wizard';
import { Wizard } from './wizard';

afterEach(() => {
  cleanup();
  submitResourceMock.mockClear();
  pushMock.mockClear();
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
    render(<Wizard config={persistCfg} mode="create" entities={{}} initialResourceId={null} />);
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    expect(submitResourceMock).toHaveBeenCalled();
  });
});

describe('<Wizard> Concluir', () => {
  const one = defineWizard({
    resource: 'x',
    steps: ['a'],
    registry: { a: { key: 'a', label: 'Passo A', Component: () => <p>conteudo A</p> } },
    finishHrefByMode: { create: '/criado' },
  });

  it('em edição sem destino próprio no config, sai mesmo assim (não fica parado)', async () => {
    render(<Wizard config={one} mode="edit" entities={{}} initialResourceId="1" />);
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }));
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith('/painel'));
  });

  it('usa onExit quando não há destino para o modo', async () => {
    const onExit = vi.fn();
    render(<Wizard config={one} mode="edit" entities={{}} initialResourceId="1" onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }));
    await vi.waitFor(() => expect(onExit).toHaveBeenCalledTimes(1));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('com destino configurado, vai para ele', async () => {
    render(<Wizard config={one} mode="create" entities={{}} initialResourceId={null} lockLayout />);
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }));
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith('/criado'));
  });
});

describe('<Wizard> cabeçalho compacto', () => {
  it('não desenha a barra do topo e põe o Cancelar no rodapé', () => {
    const { container } = render(
      <Wizard config={cfg} mode="edit" entities={{}} initialResourceId="1" />
    );
    expect(screen.queryByText('Editar')).toBeNull();
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    expect(container.querySelector('[data-wz-footer]')?.contains(cancel)).toBe(true);
    expect(cancel.className).toContain('text-primary');
    expect(cancel.className).toContain('focus-visible:ring-2');
    expect(screen.getAllByRole('button', { name: /cancelar/i })).toHaveLength(1);
  });

  it('preserva a ação: confirma ao sair de um cadastro novo', () => {
    const onExit = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Wizard config={cfg} mode="create" entities={{}} initialResourceId={null} onExit={onExit} lockLayout />);
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancel);
    expect(onExit).not.toHaveBeenCalled();
    fireEvent.click(cancel);
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(onExit).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it('em edição sai sem confirmar', () => {
    const onExit = vi.fn();
    const confirm = vi.spyOn(window, 'confirm');
    render(<Wizard config={cfg} mode="edit" entities={{}} initialResourceId="1" onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onExit).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it('header="bar" mantém a barra antiga com o rótulo e o Cancelar no topo', () => {
    const { container } = render(
      <Wizard config={cfg} mode="edit" entities={{}} initialResourceId="1" header="bar" />
    );
    expect(screen.getByText('Editar')).toBeTruthy();
    const cancel = screen.getByRole('button', { name: /cancelar/i });
    expect(container.querySelector('[data-wz-footer]')?.contains(cancel)).toBe(false);
  });
});
