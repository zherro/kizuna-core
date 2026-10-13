/**
 * Cor do "chapéu" (kicker) de um card de lugar: uma matiz OKLCH por grupo, escolhida de forma
 * determinística a partir do texto do grupo (ex.: "Shopping", "Casa de festas"). O mesmo texto
 * sempre cai na mesma cor, sem config nenhuma — o core não conhece os grupos de um projeto.
 *
 * A matiz sai de uma paleta curta e espaçada (não do hash cru), pra evitar tons lamacentos e
 * vizinhos parecidos demais. As cores de texto usam `color-mix` com `--foreground`, então o mesmo
 * valor fica escuro no tema claro e claro no tema escuro, sem depender da variante `dark:`.
 */

/** Matizes OKLCH da paleta (coral, âmbar, oliva, verde, turquesa, azul, violeta, magenta). */
export const PLACE_TONE_HUES = [25, 60, 105, 150, 190, 240, 285, 330] as const;

export type PlaceTone = {
  /** Matiz OKLCH (0-360) do grupo. */
  hue: number;
  /** Cor do texto do chapéu sobre a superfície da página (acompanha claro/escuro). */
  ink: string;
  /** Fundo sólido do chapéu sobre foto, legível com texto branco. */
  solid: string;
  /** Gradiente de fundo quando o lugar não tem foto. */
  wash: string;
};

/** Normaliza o texto do grupo: sem acento, minúsculo, espaços colapsados. */
export function normalizePlaceKicker(kicker: string): string {
  return kicker
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** FNV-1a 32 bits — curto, estável entre ambientes e bem distribuído pra textos pequenos. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Matiz do grupo. "SHOPPING", "Shopping" e " shopping " dão a mesma. */
export function placeKickerHue(kicker: string): number {
  const key = normalizePlaceKicker(kicker);
  return PLACE_TONE_HUES[hash(key) % PLACE_TONE_HUES.length];
}

/** Matiz + as cores derivadas, prontas pra `style`. */
export function placeTone(kicker: string): PlaceTone {
  const hue = placeKickerHue(kicker);
  return {
    hue,
    ink: `color-mix(in oklch, oklch(0.62 0.17 ${hue}) 72%, var(--foreground))`,
    solid: `oklch(0.5 0.15 ${hue})`,
    wash: `linear-gradient(150deg, oklch(0.72 0.14 ${hue}), oklch(0.42 0.13 ${(hue + 30) % 360}))`,
  };
}
