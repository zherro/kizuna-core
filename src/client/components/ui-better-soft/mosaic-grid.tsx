'use client';

import Link from 'next/link';
import { cn } from '../../../lib/utils';

export type MosaicGridSpan = 'default' | 'wide' | 'tall' | 'large';

export type MosaicGridItem = {
  id: string;
  label: string;
  hint?: string;
  image: string;
  href?: string;
  span?: MosaicGridSpan;
};

type MosaicGridProps = {
  items: MosaicGridItem[];
  className?: string;
  tileClassName?: string;
  onItemClick?: (item: MosaicGridItem) => void;
};

function getSpanClass(span: MosaicGridSpan | undefined) {
  if (span === 'wide') return 'col-span-2 sm:col-span-2';
  if (span === 'tall') return 'row-span-2';
  if (span === 'large') return 'col-span-2 row-span-2 sm:col-span-2';
  return 'col-span-1';
}

function MosaicTile({
  item,
  tileClassName,
  onItemClick,
}: {
  item: MosaicGridItem;
  tileClassName?: string;
  onItemClick?: (item: MosaicGridItem) => void;
}) {
  const baseClassName = cn(
    'group relative overflow-hidden rounded-2xl border border-border text-left',
    getSpanClass(item.span),
    tileClassName
  );

  const content = (
    <>
      <img
        src={item.image}
        alt={item.label}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="text-base font-semibold text-white sm:text-lg">{item.label}</p>
        {item.hint ? <p className="text-xs text-white/85 sm:text-sm">{item.hint}</p> : null}
      </div>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseClassName} onClick={() => onItemClick?.(item)}>
      {content}
    </button>
  );
}

export function MosaicGrid({ items, className, tileClassName, onItemClick }: MosaicGridProps) {
  return (
    <div
      className={cn(
        'grid auto-rows-[148px] grid-cols-2 gap-3 sm:auto-rows-[170px] sm:grid-cols-4',
        className
      )}
    >
      {items.map((item) => (
        <MosaicTile
          key={item.id}
          item={item}
          tileClassName={tileClassName}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
}
