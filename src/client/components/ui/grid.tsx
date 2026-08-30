import { ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from './card';

/**
| Nome        | Largura |
| ----------- | ------- |
| `compact`   | 1024px  |
| `default`   | 1280px  |
| `wide`      | 1440px  |
| `ultraWide` | 1600px  |
| `fluid`     | 100%    |
*/
type ContainerSize = 'compact' | 'default' | 'wide' | 'ultraWide' | 'fluid';

type PaddingPreset = 'none' | 'sm' | 'default' | 'lg' | 'xl';
type Cols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Breakpoints = {
  xs?: Cols;
  sm?: Cols;
  md?: Cols;
  lg?: Cols;
  xl?: Cols;
};

type Space = {
  spaceY?: number;
  spaceX?: number;
  space?: number;
};

export type GridProps = Breakpoints &
  Space & {
    children?: ReactNode;
    container?: boolean;
    card?: boolean;
    row?: boolean;
    gap?: number;
    className?: string;
    padding?: PaddingPreset;
    px?: number;
    py?: number;
    containerSize?: ContainerSize;
  };

const colClass = (bp: BreakpointKey, value?: Cols) => {
  if (!value) return null;
  return COL_SPAN_MAP[bp][value];
};

const CONTAINER_SIZE_MAP = {
  compact: 'mx-auto w-full max-w-[1024px]',
  default: 'mx-auto w-full max-w-[1280px]',
  wide: 'mx-auto w-full max-w-[1440px]',
  ultraWide: 'mx-auto w-full max-w-[1600px]',
  fluid: 'w-full',
} as const;

const PADDING_MAP = {
  none: '',
  sm: 'px-2 py-2',
  default: 'px-4 sm:px-6 lg:px-8 py-4',
  lg: 'px-6 sm:px-8 lg:px-12 py-6',
  xl: 'px-8 sm:px-10 lg:px-16 py-10',
} as const;

const spacing = (value?: number, prefix: 'p' | 'px' | 'py' = 'p') => {
  if (value === undefined) return '';
  return `${prefix}-${value}`;
};

export function Grid({
  children,
  container,
  card,
  row,
  gap = 4,
  className,
  xs = 12,
  sm,
  md,
  lg,
  xl,
  padding,
  px,
  py,
  containerSize = 'default',
}: GridProps) {
  const render = (content: ReactNode) => (card ? <Card className="p-4">{content}</Card> : content);

  const classStyle = className ?? '';

  /* =======================
     CONTAINER
  ======================= */
  if (container) {
    return (
      <div
        className={clsx(
          CONTAINER_SIZE_MAP[containerSize],
          'grid grid-cols-12',
          typeof padding === 'number' ? ` p-${padding} ` : PADDING_MAP[padding ?? 'default'],
          spacing(px, 'px'),
          spacing(py, 'py'),
          `gap-${gap}`,
          classStyle
        )}
      >
        {render(children)}
      </div>
    );
  }

  /* =======================
     ROW (opcional)
  ======================= */
  if (row) {
    return (
      <div className={clsx('grid grid-cols-12 col-span-12', classStyle)}>{render(children)}</div>
    );
  }

  /* =======================
     ITEM (default)
  ======================= */
  return (
    <div
      className={clsx(
        colClass('xs', xs),
        colClass('sm', sm),
        colClass('md', md),
        colClass('lg', lg),
        colClass('xl', xl),
        classStyle
      )}
    >
      {render(children)}
    </div>
  );
}

const COL_SPAN_MAP = {
  xs: {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  },
  sm: {
    1: 'sm:col-span-1',
    2: 'sm:col-span-2',
    3: 'sm:col-span-3',
    4: 'sm:col-span-4',
    5: 'sm:col-span-5',
    6: 'sm:col-span-6',
    7: 'sm:col-span-7',
    8: 'sm:col-span-8',
    9: 'sm:col-span-9',
    10: 'sm:col-span-10',
    11: 'sm:col-span-11',
    12: 'sm:col-span-12',
  },
  md: {
    1: 'md:col-span-1',
    2: 'md:col-span-2',
    3: 'md:col-span-3',
    4: 'md:col-span-4',
    5: 'md:col-span-5',
    6: 'md:col-span-6',
    7: 'md:col-span-7',
    8: 'md:col-span-8',
    9: 'md:col-span-9',
    10: 'md:col-span-10',
    11: 'md:col-span-11',
    12: 'md:col-span-12',
  },
  lg: {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
    4: 'lg:col-span-4',
    5: 'lg:col-span-5',
    6: 'lg:col-span-6',
    7: 'lg:col-span-7',
    8: 'lg:col-span-8',
    9: 'lg:col-span-9',
    10: 'lg:col-span-10',
    11: 'lg:col-span-11',
    12: 'lg:col-span-12',
  },
  xl: {
    1: 'xl:col-span-1',
    2: 'xl:col-span-2',
    3: 'xl:col-span-3',
    4: 'xl:col-span-4',
    5: 'xl:col-span-5',
    6: 'xl:col-span-6',
    7: 'xl:col-span-7',
    8: 'xl:col-span-8',
    9: 'xl:col-span-9',
    10: 'xl:col-span-10',
    11: 'xl:col-span-11',
    12: 'xl:col-span-12',
  },
} as const;
