// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddressForm, toUf } from './address-google-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const input = (label: string) =>
  screen.getByText(label, { selector: 'label' }).parentElement!.querySelector('input')!;

const CITIES = { items: [{ value: '5103403', label: 'Cuiabá' }, { value: '5108402', label: 'Várzea Grande' }] };

/** fetch falso por rota: `cep` e `cities` respondem o que o teste mandar. */
function stubFetch(routes: { cep?: { status: number; body?: unknown }; cities?: { status: number; body?: unknown } }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const route = url.includes('/cep') ? routes.cep : url.includes('/cities') ? routes.cities : undefined;
      const status = route?.status ?? 500;
      return { ok: status < 400, status, json: async () => route?.body ?? {} };
    })
  );
}

describe('AddressForm — compacto: só CEP e resumo na tela', () => {
  it('vazio: CEP, "Não sei meu CEP" e o link de latitude/longitude — nenhum outro campo', () => {
    render(<AddressForm layout="compact" searchLabel="Não sei meu CEP" />);
    expect(screen.getByText('CEP', { selector: 'label' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Não sei meu CEP/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /latitude e longitude/ })).toBeTruthy();
    expect(screen.queryByText('Endereço', { selector: 'label' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('CEP opcional: mesmo layout compacto, rótulo "CEP (opcional)"', () => {
    render(<AddressForm layout="compact" requirePostalCode={false} />);
    expect(screen.getByText('CEP (opcional)', { selector: 'label' })).toBeTruthy();
    expect(screen.queryByText('Endereço', { selector: 'label' })).toBeNull();
  });

  it('com endereço: mostra o resumo, e ele abre o painel', async () => {
    stubFetch({ cities: { status: 200, body: CITIES } });
    render(<AddressForm layout="compact" value={{ street: 'Rua A', city: 'Cuiabá', state: 'MT', cityIbge: '5103403' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Rua A/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

describe('AddressForm — CEP abre o painel lateral', () => {
  it('CEP achado: consulta pelo servidor, preenche e abre o painel', async () => {
    stubFetch({
      cep: { status: 200, body: { street: 'Avenida X', neighborhood: 'Centro', city: 'Cuiabá', state: 'MT', ibge: '5103403' } },
      cities: { status: 200, body: CITIES },
    });
    const onChange = vi.fn();
    render(<AddressForm layout="compact" onChange={onChange} />);
    fireEvent.change(input('CEP'), { target: { value: '78048-000' } });
    await screen.findByRole('dialog');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ city: 'Cuiabá', state: 'MT', street: 'Avenida X', cityIbge: '5103403' })
    );
    expect(input('Endereço').value).toBe('Avenida X');
    expect((screen.getByRole('button', { name: 'Concluir' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('CEP não encontrado: diz isso, abre o painel e exige a cidade', async () => {
    stubFetch({ cep: { status: 404 }, cities: { status: 200, body: CITIES } });
    render(<AddressForm layout="compact" />);
    fireEvent.change(input('CEP'), { target: { value: '78048000' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/78048-000 não foi encontrado/);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(input('Endereço').disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Concluir' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('consulta fora do ar: diz que o serviço não respondeu (não que o CEP não existe)', async () => {
    stubFetch({ cep: { status: 502 } });
    render(<AddressForm layout="compact" />);
    fireEvent.change(input('CEP'), { target: { value: '78048000' } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/não foi possível consultar/i);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

describe('AddressForm — cidade obrigatória na lista', () => {
  it('UF + cidade pesquisável: a cidade escolhida leva o código IBGE e libera o Concluir', async () => {
    stubFetch({ cep: { status: 404 }, cities: { status: 200, body: CITIES } });
    const onChange = vi.fn();
    render(<AddressForm layout="compact" onChange={onChange} />);
    fireEvent.change(input('CEP'), { target: { value: '78048000' } });
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('combobox', { name: 'UF' }));
    fireEvent.click(screen.getByRole('option', { name: 'MT · Mato Grosso' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Cidade' }).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('combobox', { name: 'Cidade' }));
    fireEvent.change(screen.getByPlaceholderText('Pesquisar...'), { target: { value: 'cuia' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Cuiabá' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Cuiabá', state: 'MT', cityIbge: '5103403' }));
    expect((screen.getByRole('button', { name: 'Concluir' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('estado por extenso (vindo do Google) vira sigla e a cidade é achada pelo nome', async () => {
    stubFetch({ cities: { status: 200, body: CITIES } });
    const onChange = vi.fn();
    render(<AddressForm layout="compact" value={{ street: 'Rua A', city: 'Várzea Grande', state: 'Mato Grosso' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /Rua A/ }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Várzea Grande', cityIbge: '5108402' })));
  });

  it('lista de cidades fora do ar: a cidade vira campo de texto (não trava o cadastro)', async () => {
    stubFetch({ cep: { status: 404 }, cities: { status: 502 } });
    const onChange = vi.fn();
    render(<AddressForm layout="compact" value={{ state: 'MT' }} onChange={onChange} />);
    fireEvent.change(input('CEP'), { target: { value: '78048000' } });
    await screen.findByRole('dialog');
    await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Cidade' })).toBeNull());
    fireEvent.change(input('Cidade'), { target: { value: 'Cuiabá' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Cuiabá', state: 'MT', cityIbge: null }));
    expect((screen.getByRole('button', { name: 'Concluir' }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('toUf', () => {
  it('sigla ou nome por extenso → sigla', () => {
    expect(toUf('mt')).toBe('MT');
    expect(toUf('Mato Grosso')).toBe('MT');
    expect(toUf('Mato Grosso do Sul')).toBe('MS');
    expect(toUf('São Paulo')).toBe('SP');
    expect(toUf('State of Nowhere')).toBe('State of Nowhere');
  });
});
