import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

type PageContainerWrapperProps = {
  children: ReactNode;
  maxWidth?: 'form' | 'wide';
  className?: string;
};

const MAX_WIDTH_CLASS: Record<NonNullable<PageContainerWrapperProps['maxWidth']>, string> = {
  form: 'max-w-[1100px]',
  wide: 'max-w-[1500px]',
};

export function PageContainerWrapper({
  children,
  maxWidth = 'form',
  className,
}: Readonly<PageContainerWrapperProps>) {
  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 md:px-6',
        MAX_WIDTH_CLASS[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
