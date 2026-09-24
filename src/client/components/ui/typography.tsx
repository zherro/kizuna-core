import { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type HtmlTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl';
type ResponsiveSize = Partial<Record<Breakpoint, TextSize>>;
type Color = 'default' | 'muted' | 'primary' | 'secondary' | 'destructive' | 'display';
type Weight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';
type Align = 'left' | 'center' | 'right' | 'justify';
/** sans = fonte do corpo; display = fonte de títulos do tema (--font-display); mono = código. */
type Font = 'sans' | 'display' | 'mono';
/**
 * Largura máxima da linha, em letras reais por linha: narrow ≈ 45, normal ≈ 66, wide ≈ 80.
 * (`ch` é a largura do "0"; texto corrido tem letras mais estreitas, daí os valores menores.)
 */
type Measure = 'narrow' | 'normal' | 'wide';

type TypographyProps = {
  as: HtmlTag;
  children: ReactNode;
  className?: string;
  /**
   * Um token (`'2xl'`) usa a escala fluida: cresce suave entre 360px e 1280px de largura,
   * sem saltos por breakpoint. Um objeto (`{ base: 'lg', md: '2xl' }`) fixa o tamanho por
   * breakpoint — use só quando precisar de controle exato.
   */
  size?: TextSize | ResponsiveSize;
  color?: Color;
  weight?: Weight;
  /** Família da fonte. Sem a prop, herda do elemento pai (normalmente `sans`). */
  font?: Font;
  align?: Align;
  /** Limita o comprimento da linha para leitura confortável. `true` = `'normal'`. */
  measure?: Measure | boolean;
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  bold?: boolean;
  italic?: boolean;
};

// ─── Escala ───────────────────────────────────────────────────────────────────
//
// Tailwind v4 só gera classes que aparecem inteiras no código — sem interpolação
// (`${bp}:text-${size}`). Por isso todos os mapas abaixo são literais.
//
// Escala fluida: clamp(mín, rem + vw, máx), interpolando de 360px a 1280px de viewport.
// No mobile a razão entre degraus é menor (títulos não engolem a tela); no desktop abre.
// Mín/máx em rem para respeitar o zoom/tamanho de fonte do navegador.
//
//   token  mobile → desktop (px)
//   xs     12
//   sm     14
//   base   16 → 17   corpo de texto
//   lg     18 → 20   lead / subtítulo
//   xl     20 → 24   h4
//   2xl    22 → 30   h3
//   3xl    24 → 36   h2
//   4xl    28 → 44
//   5xl    30 → 52   h1
//   6xl    36 → 64   display

const FLUID_SIZE: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-[length:clamp(1rem,0.976rem+0.109vw,1.0625rem)]',
  lg: 'text-[length:clamp(1.125rem,1.076rem+0.217vw,1.25rem)]',
  xl: 'text-[length:clamp(1.25rem,1.152rem+0.435vw,1.5rem)]',
  '2xl': 'text-[length:clamp(1.375rem,1.179rem+0.87vw,1.875rem)]',
  '3xl': 'text-[length:clamp(1.5rem,1.207rem+1.304vw,2.25rem)]',
  '4xl': 'text-[length:clamp(1.75rem,1.359rem+1.739vw,2.75rem)]',
  '5xl': 'text-[length:clamp(1.875rem,1.337rem+2.391vw,3.25rem)]',
  '6xl': 'text-[length:clamp(2.25rem,1.565rem+3.043vw,4rem)]',
};

const BASE_SIZE: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
  '6xl': 'text-6xl',
};

const SM_SIZE: Record<TextSize, string> = {
  xs: 'sm:text-xs',
  sm: 'sm:text-sm',
  base: 'sm:text-base',
  lg: 'sm:text-lg',
  xl: 'sm:text-xl',
  '2xl': 'sm:text-2xl',
  '3xl': 'sm:text-3xl',
  '4xl': 'sm:text-4xl',
  '5xl': 'sm:text-5xl',
  '6xl': 'sm:text-6xl',
};

const MD_SIZE: Record<TextSize, string> = {
  xs: 'md:text-xs',
  sm: 'md:text-sm',
  base: 'md:text-base',
  lg: 'md:text-lg',
  xl: 'md:text-xl',
  '2xl': 'md:text-2xl',
  '3xl': 'md:text-3xl',
  '4xl': 'md:text-4xl',
  '5xl': 'md:text-5xl',
  '6xl': 'md:text-6xl',
};

const LG_SIZE: Record<TextSize, string> = {
  xs: 'lg:text-xs',
  sm: 'lg:text-sm',
  base: 'lg:text-base',
  lg: 'lg:text-lg',
  xl: 'lg:text-xl',
  '2xl': 'lg:text-2xl',
  '3xl': 'lg:text-3xl',
  '4xl': 'lg:text-4xl',
  '5xl': 'lg:text-5xl',
  '6xl': 'lg:text-6xl',
};

const XL_SIZE: Record<TextSize, string> = {
  xs: 'xl:text-xs',
  sm: 'xl:text-sm',
  base: 'xl:text-base',
  lg: 'xl:text-lg',
  xl: 'xl:text-xl',
  '2xl': 'xl:text-2xl',
  '3xl': 'xl:text-3xl',
  '4xl': 'xl:text-4xl',
  '5xl': 'xl:text-5xl',
  '6xl': 'xl:text-6xl',
};

const BP_MAP: Record<Breakpoint, Record<TextSize, string>> = {
  base: BASE_SIZE,
  sm: SM_SIZE,
  md: MD_SIZE,
  lg: LG_SIZE,
  xl: XL_SIZE,
};

const BP_ORDER: Breakpoint[] = ['base', 'sm', 'md', 'lg', 'xl'];

function sizeClasses(size: TextSize | ResponsiveSize): string[] {
  if (typeof size === 'string') return [FLUID_SIZE[size]];
  return BP_ORDER.filter((bp) => size[bp] !== undefined).map((bp) => BP_MAP[bp][size[bp]!]);
}

/** Token que define entrelinha/tracking: o próprio, ou o do maior breakpoint informado. */
function dominantSize(size: TextSize | ResponsiveSize): TextSize {
  if (typeof size === 'string') return size;
  const last = [...BP_ORDER].reverse().find((bp) => size[bp] !== undefined);
  return last ? size[last]! : 'base';
}

// ─── Ritmo: entrelinha e tracking acompanham o tamanho ───────────────────────
//
// Texto corrido precisa de mais ar; título grande precisa de menos (e de tracking
// levemente negativo, senão as letras "abrem" em corpo grande).

const LEADING_TEXT: Record<TextSize, string> = {
  xs: 'leading-[1.5]',
  sm: 'leading-[1.55]',
  base: 'leading-[1.65]',
  lg: 'leading-[1.6]',
  xl: 'leading-[1.45]',
  '2xl': 'leading-[1.35]',
  '3xl': 'leading-[1.25]',
  '4xl': 'leading-[1.2]',
  '5xl': 'leading-[1.1]',
  '6xl': 'leading-[1.05]',
};

const LEADING_HEADING: Record<TextSize, string> = {
  xs: 'leading-[1.4]',
  sm: 'leading-[1.4]',
  base: 'leading-[1.4]',
  lg: 'leading-[1.35]',
  xl: 'leading-[1.3]',
  '2xl': 'leading-[1.25]',
  '3xl': 'leading-[1.2]',
  '4xl': 'leading-[1.15]',
  '5xl': 'leading-[1.1]',
  '6xl': 'leading-[1.05]',
};

const TRACKING: Partial<Record<TextSize, string>> = {
  lg: 'tracking-[-0.005em]',
  xl: 'tracking-[-0.01em]',
  '2xl': 'tracking-[-0.015em]',
  '3xl': 'tracking-[-0.02em]',
  '4xl': 'tracking-[-0.02em]',
  '5xl': 'tracking-[-0.025em]',
  '6xl': 'tracking-[-0.03em]',
};

// ─── Defaults por tag ─────────────────────────────────────────────────────────

const DEFAULT_SIZE: Record<HtmlTag, TextSize | undefined> = {
  h1: '5xl',
  h2: '3xl',
  h3: '2xl',
  h4: 'xl',
  h5: 'lg',
  h6: 'base',
  p: 'base',
  // inline: herda o tamanho do texto em volta, a menos que `size` seja passado
  span: undefined,
};

const DEFAULT_WEIGHT: Record<HtmlTag, Weight | undefined> = {
  h1: 'semibold',
  h2: 'semibold',
  h3: 'semibold',
  h4: 'semibold',
  h5: 'medium',
  h6: 'medium',
  p: 'normal',
  span: undefined,
};

// ─── Outros mapas ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<Color, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  secondary: 'text-secondary-foreground',
  destructive: 'text-destructive',
  // --foreground-display: por padrão = --foreground; o tema pode deixar mais claro/quente —
  // um serifado grande (font="display") "pesa" mais na tela que o corpo na mesma cor.
  display: 'text-foreground-display',
};

const WEIGHT_MAP: Record<Weight, string> = {
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  extrabold: 'font-extrabold',
};

const FONT_MAP: Record<Font, string> = {
  sans: 'font-sans',
  display: 'font-display',
  mono: 'font-mono',
};

const ALIGN_MAP: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify',
};

const MEASURE_MAP: Record<Measure, string> = {
  narrow: 'max-w-[40ch]',
  normal: 'max-w-[58ch]',
  wide: 'max-w-[70ch]',
};

const LINE_CLAMP_MAP: Record<number, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};

const HEADING_TAGS: HtmlTag[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// ─── Base component ───────────────────────────────────────────────────────────

function TypographyBase({
  as,
  children,
  className,
  size,
  color,
  weight,
  font,
  align,
  measure,
  lineClamp,
  bold = false,
  italic = false,
}: TypographyProps) {
  const Component = as;
  const isHeading = HEADING_TAGS.includes(as);
  const isInline = as === 'span';

  const resolvedSize = size ?? DEFAULT_SIZE[as];
  const token = resolvedSize ? dominantSize(resolvedSize) : undefined;
  const resolvedWeight = bold ? 'bold' : (weight ?? DEFAULT_WEIGHT[as]);
  // span herda cor do texto em volta; blocos assumem a cor padrão
  const resolvedColor = color ?? (font === 'display' ? 'display' : isInline ? undefined : 'default');
  const resolvedMeasure = measure === true ? 'normal' : measure || undefined;

  return (
    <Component
      className={cn(
        resolvedSize && sizeClasses(resolvedSize),
        token && (isHeading ? LEADING_HEADING : LEADING_TEXT)[token],
        token && TRACKING[token],
        resolvedColor && COLOR_MAP[resolvedColor],
        resolvedWeight && WEIGHT_MAP[resolvedWeight],
        font && FONT_MAP[font],
        align && ALIGN_MAP[align],
        resolvedMeasure && MEASURE_MAP[resolvedMeasure],
        resolvedMeasure && align === 'center' && 'mx-auto',
        lineClamp && LINE_CLAMP_MAP[lineClamp],
        // títulos: quebra equilibrada entre linhas; texto: evita palavra solitária na última linha
        !isInline && (isHeading ? 'text-balance' : 'text-pretty'),
        // palavra longa (URL, e-mail) quebra em vez de estourar a tela no mobile
        !isInline && 'break-words',
        italic && 'italic',
        className
      )}
    >
      {children}
    </Component>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

type PublicProps = Omit<TypographyProps, 'as'>;

export const Typography = {
  H1: (props: PublicProps) => <TypographyBase as="h1" {...props} />,
  H2: (props: PublicProps) => <TypographyBase as="h2" {...props} />,
  H3: (props: PublicProps) => <TypographyBase as="h3" {...props} />,
  H4: (props: PublicProps) => <TypographyBase as="h4" {...props} />,
  H5: (props: PublicProps) => <TypographyBase as="h5" {...props} />,
  H6: (props: PublicProps) => <TypographyBase as="h6" {...props} />,
  P: (props: PublicProps) => <TypographyBase as="p" {...props} />,
  /** Parágrafo de abertura/subtítulo: um degrau acima do corpo, em tom secundário. */
  Lead: (props: PublicProps) => <TypographyBase as="p" size="lg" color="muted" {...props} />,
  /** Texto de apoio (legenda, nota, metadado). */
  Small: (props: PublicProps) => <TypographyBase as="p" size="sm" color="muted" {...props} />,
  Span: (props: PublicProps) => <TypographyBase as="span" {...props} />,
};
