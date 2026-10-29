// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddressForm } from './address-google-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const input = (label: string) =>
  screen.getByText(label, { selector: 'label' }).parentElement!.querySelector('input')!;

describe('AddressForm — CEP opcional', () => {
  it('padrão: compacto, só o CEP enquanto vazio', () => {
    render(<AddressForm layout="compact" />);
    expect(screen.getByText('CEP', { selector: 'label' })).toBeTruthy();
    expect(screen.queryByText('Endereço', { selector: 'label' })).toBeNull();
  });

  it('requirePostalCode=false: campos abertos e editáveis sem CEP, CEP marcado como opcional', () => {
    render(<AddressForm layout="compact" requirePostalCode={false} />);
    expect(screen.getByText('CEP (opcional)', { selector: 'label' })).toBeTruthy();
    for (const label of ['Endereço', 'Número']) {
      expect(input(label).disabled).toBe(false);
    }
    // Cidade e UF: listas pesquisáveis (a cidade só libera depois da UF)
    expect(screen.getByRole('combobox', { name: 'UF' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Cidade' }).hasAttribute('disabled')).toBe(true);
  });
});

describe('AddressForm — busca do CEP', () => {
  const cepInput = () => input('CEP');

  it('consulta pelo servidor e preenche rua, bairro, cidade e UF', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        return {
          ok: true,
          status: 200,
          json: async () => ({ cep: '78048-000', street: 'Avenida X', neighborhood: 'Centro', city: 'Cuiabá', state: 'MT' }),
        };
      })
    );
    const onChange = vi.fn();
    render(<AddressForm layout="compact" onChange={onChange} />);
    fireEvent.change(cepInput(), { target: { value: '78048-000' } });
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Cuiabá', state: 'MT', street: 'Avenida X' })));
    expect(urls).toEqual(['/api/location/cep?cep=78048000']);
  });

  it('CEP não encontrado ou consulta fora do ar: avisa para preencher à mão', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    render(<AddressForm layout="compact" />);
    fireEvent.change(cepInput(), { target: { value: '78048000' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/preencha o endereço/i);
    // layout compacto: os campos aparecem já na tela, com a cidade na lista
    expect(input('Endereço').disabled).toBe(false);
    expect(screen.getByRole('combobox', { name: 'UF' })).toBeTruthy();
  });
});

describe('AddressForm — cidade na lista', () => {
  it('UF + cidade pesquisável: a cidade escolhida leva o código IBGE', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ value: '5103403', label: 'Cuiabá' }, { value: '5108402', label: 'Várzea Grande' }] }),
      }))
    );
    const onChange = vi.fn();
    render(<AddressForm layout="compact" requirePostalCode={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'UF' }));
    fireEvent.click(screen.getByRole('option', { name: 'MT' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cidade' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('combobox', { name: 'Cidade' }));
    fireEvent.change(screen.getByPlaceholderText('Pesquisar...'), { target: { value: 'cuia' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Cuiabá' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Cuiabá', state: 'MT', cityIbge: '5103403' }));
  });
});

describe('AddressForm — lista de cidades fora do ar', () => {
  it('a cidade vira campo de texto (não trava o cadastro)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ items: [] }) })));
    const onChange = vi.fn();
    render(<AddressForm layout="compact" requirePostalCode={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox', { name: 'UF' }));
    fireEvent.click(screen.getByRole('option', { name: 'MT' }));
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Cidade' })).toBeNull());
    fireEvent.change(input('Cidade'), { target: { value: 'Cuiabá' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Cuiabá', state: 'MT', cityIbge: null }));
  });
});
