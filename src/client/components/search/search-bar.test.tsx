// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SearchBar } from './search-bar';

afterEach(cleanup);

describe('SearchBar', () => {
  it('mostra o valor, usa o placeholder padrão e propaga a digitação', () => {
    const onChange = vi.fn();
    render(<SearchBar value="pizza" onChange={onChange} onSubmit={() => {}} />);
    const input = screen.getByPlaceholderText('O que você procura?') as HTMLInputElement;
    expect(input.value).toBe('pizza');
    fireEvent.change(input, { target: { value: 'sushi' } });
    expect(onChange).toHaveBeenCalledWith('sushi');
  });

  it('envia o texto atual ao enviar o form', () => {
    const onSubmit = vi.fn();
    render(<SearchBar value="  bar  " onChange={() => {}} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onSubmit).toHaveBeenCalledWith('  bar  ');
  });

  it('chip de localização só existe com locationLabel e dispara onLocationClick', () => {
    const onLocationClick = vi.fn();
    const { rerender } = render(<SearchBar value="" onChange={() => {}} onSubmit={() => {}} />);
    expect(screen.queryByLabelText('Trocar localização')).toBeNull();
    rerender(
      <SearchBar value="" onChange={() => {}} onSubmit={() => {}} locationLabel="Cuiabá" onLocationClick={onLocationClick} />
    );
    fireEvent.click(screen.getByLabelText('Trocar localização'));
    expect(onLocationClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Cuiabá')).toBeTruthy();
  });

  it('botão do assistente só existe com assistant e recebe o texto, sem enviar o form', () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn();
    const { rerender } = render(<SearchBar value="x" onChange={() => {}} onSubmit={onSubmit} />);
    expect(screen.queryByLabelText('Falar com o assistente')).toBeNull();
    rerender(<SearchBar value="x" onChange={() => {}} onSubmit={onSubmit} assistant={{ onClick }} />);
    fireEvent.click(screen.getByLabelText('Falar com o assistente'));
    expect(onClick).toHaveBeenCalledWith('x');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
