'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';
import clsx from 'clsx';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return <label className={cn('text-sm font-medium text-foreground', className)} {...props} />;
}

type SectionLabelProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={clsx(
        // Tamanho responsivo
        'text-[10px] sm:text-xs md:text-sm',

        // Estilo
        'font-medium uppercase tracking-[0.22em]',

        // Cor
        'text-primary',

        className
      )}
    >
      {children}
    </p>
  );
}
