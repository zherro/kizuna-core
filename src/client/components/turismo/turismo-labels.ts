/** Textos e níveis dos campos de turismo (puro, sem React): usados pelos cartões e pelos filtros. */

export type DificuldadeInfo = { label: string; level: 1 | 2 | 3 };

const DIFICULDADES: Record<string, DificuldadeInfo> = {
  facil: { label: 'Fácil', level: 1 },
  moderado: { label: 'Moderado', level: 2 },
  dificil: { label: 'Difícil', level: 3 },
};

/** `facil | moderado | dificil` -> rótulo e nível (1 a 3); valor desconhecido ou vazio -> null. */
export function dificuldadeInfo(value: string | null | undefined): DificuldadeInfo | null {
  return (value && DIFICULDADES[value]) || null;
}

const TIPOS: Record<string, string> = { dormir: 'Onde dormir', comer: 'Onde comer', atracao: 'O que fazer' };
const TIPOS_CURTO: Record<string, string> = { dormir: 'Dormir', comer: 'Comer', atracao: 'Atrações' };

export function tipoLabel(tipo: string, short = false): string {
  return (short ? TIPOS_CURTO : TIPOS)[tipo] ?? tipo;
}

const FAIXAS: Record<string, string> = { $: 'Econômico', $$: 'Intermediário', $$$: 'Sofisticado' };

export function faixaLabel(faixa: string): string {
  return FAIXAS[faixa] ?? faixa;
}

export function paradasLabel(count: number): string {
  return count === 1 ? '1 parada' : `${count} paradas`;
}

export function lugaresLabel(count: number): string {
  return count === 1 ? '1 lugar' : `${count} lugares`;
}
