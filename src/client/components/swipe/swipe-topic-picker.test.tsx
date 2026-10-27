// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const state = vi.hoisted(() => ({ value: null as unknown }));
vi.mock('../search/filters/use-filter-taxonomy', () => ({
  useFilterTaxonomy: () => state.value,
}));

import { SwipeTopicPicker } from './swipe-topic-picker';

const taxonomy = {
  groups: [
    { id: 1, slug: 'comer', name: 'Comer', icon: null },
    { id: 2, slug: 'passear', name: 'Passear', icon: null },
    { id: 3, slug: 'vazio', name: 'Vazio', icon: null },
  ],
  categories: [
    { id: 10, name: 'Bar', icon: null, groupId: 1, extraGroupIds: [], subs: [] },
    { id: 11, name: 'Parque', icon: null, groupId: 2, extraGroupIds: [], subs: [] },
  ],
};
const ready = () => ({ taxonomy, loading: false, error: '', retry: vi.fn() });
const empty = { groups: [], categories: [] };

afterEach(() => cleanup());

describe('SwipeTopicPicker', () => {
  it('Começar fica desabilitado sem seleção e esconde grupos sem categoria', () => {
    state.value = ready();
    render(<SwipeTopicPicker onConfirm={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'Começar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Vazio')).toBeNull();
  });

  it('marca vários temas e confirma com os slugs', () => {
    state.value = ready();
    const onConfirm = vi.fn();
    render(<SwipeTopicPicker onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Comer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Passear' }));
    expect(screen.getByRole('button', { name: 'Comer' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }));
    expect(onConfirm).toHaveBeenCalledWith(['comer', 'passear']);
  });

  it('respeita initial e alterna Selecionar todos/Limpar', () => {
    state.value = ready();
    render(<SwipeTopicPicker initial={['comer']} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Comer' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar todos' }));
    expect(screen.getByRole('button', { name: 'Passear' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
    expect((screen.getByRole('button', { name: 'Começar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('mostra skeleton ao carregar e retry no erro', () => {
    state.value = { taxonomy: empty, loading: true, error: '', retry: vi.fn() };
    const { rerender } = render(<SwipeTopicPicker onConfirm={vi.fn()} />);
    expect(screen.getAllByTestId('topic-skeleton').length).toBeGreaterThan(0);
    const retry = vi.fn();
    state.value = { taxonomy: empty, loading: false, error: 'x', retry };
    rerender(<SwipeTopicPicker onConfirm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(retry).toHaveBeenCalled();
  });

  it('Voltar chama onCancel quando informado', () => {
    state.value = ready();
    const onCancel = vi.fn();
    render(<SwipeTopicPicker onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
