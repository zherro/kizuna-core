'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';

type ShadowLabProps = {
  className?: string;
};

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: Readonly<SliderFieldProps>) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-sm font-medium">
        {label}
        <span className="text-muted-foreground">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full accent-primary"
      />
    </label>
  );
}

/**
 * Ferramenta de dev: monta um `box-shadow` ajustando deslocamento/desfoque/espalhamento/opacidade
 * na hora, com preview lado a lado num par de superfícies quase idênticas (branco sobre branco) e
 * num par de cor do tema sobre o fundo do tema — os dois casos onde uma sombra mal calibrada
 * "some" porque as cores são próximas demais. Sem lógica de negócio, genérico.
 */
export function ShadowLab({ className }: Readonly<ShadowLabProps>) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(-4);
  const [blur, setBlur] = useState(10);
  const [spread, setSpread] = useState(-2);
  const [opacity, setOpacity] = useState(0.18);
  const [inset, setInset] = useState(false);
  const [copied, setCopied] = useState(false);

  const shadowValue = `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px rgba(0,0,0,${opacity})`;
  const tailwindClass = `shadow-[${shadowValue.replace(/ /g, '_')}]`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tailwindClass);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SliderField
          label="Deslocamento X"
          value={x}
          min={-40}
          max={40}
          unit="px"
          onChange={setX}
        />
        <SliderField
          label="Deslocamento Y"
          value={y}
          min={-40}
          max={40}
          unit="px"
          onChange={setY}
        />
        <SliderField
          label="Desfoque (blur)"
          value={blur}
          min={0}
          max={80}
          unit="px"
          onChange={setBlur}
        />
        <SliderField
          label="Espalhamento (spread)"
          value={spread}
          min={-40}
          max={40}
          unit="px"
          onChange={setSpread}
        />
        <SliderField
          label="Opacidade"
          value={opacity}
          min={0}
          max={0.5}
          step={0.01}
          onChange={setOpacity}
        />
        <label className="flex items-center gap-2 pt-6 text-sm font-medium">
          <input
            type="checkbox"
            checked={inset}
            onChange={(event) => setInset(event.target.checked)}
            className="accent-primary"
          />
          Sombra interna (inset)
        </label>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-background p-8">
          <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Branco sobre branco
          </p>
          <div className="h-24 rounded-2xl bg-card" style={{ boxShadow: shadowValue }} />
        </div>
        <div className="rounded-2xl bg-background p-8">
          <p className="mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Cor do tema sobre o fundo do tema
          </p>
          <div
            className="h-24 rounded-2xl"
            style={{ boxShadow: shadowValue, backgroundColor: 'var(--color-primary)' }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
        <code className="text-xs break-all">{tailwindClass}</code>
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  );
}
