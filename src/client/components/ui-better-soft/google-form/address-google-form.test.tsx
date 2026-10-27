// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AddressForm } from './address-google-form';

afterEach(cleanup);

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
    for (const label of ['Endereço', 'Número', 'Cidade', 'UF']) {
      expect(input(label).disabled).toBe(false);
    }
  });
});
