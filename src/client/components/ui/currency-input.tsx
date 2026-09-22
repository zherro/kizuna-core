'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';

const MAX_CENTS_DIGITS = 12;

/** `1234.5` → `"1.234,50"`. */
export function formatBRL(value: number): string {
  return (Math.round((value || 0) * 100) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Texto digitado → valor em reais. Só os dígitos contam, como centavos (máscara BR). */
export function parseBRL(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, MAX_CENTS_DIGITS);
  return Number(digits || '0') / 100;
}

export type CurrencyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  /** Valor em reais (ex.: `1234.5`). `0` mostra o placeholder. */
  value: number;
  onValueChange: (value: number) => void;
};

/**
 * Input monetário com máscara BR que entra pela direita: cada dígito digitado empurra os
 * anteriores (`5` → `0,05`, `50` → `0,50`, `500` → `5,00`) e o backspace apaga do fim
 * (`5,00` → `0,50`). Controlado por número em reais, sem símbolo dentro do texto — o "R$" é
 * um prefixo visual.
 */
export function CurrencyInput({ value, onValueChange, className, ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
      >
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value ? formatBRL(value) : ''}
        placeholder="0,00"
        onChange={(event) => onValueChange(parseBRL(event.target.value))}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
}
