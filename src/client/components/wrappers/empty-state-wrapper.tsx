import type { ReactNode } from 'react';

type EmptyStateWrapperProps = {
  show: boolean;
  children: ReactNode;
  className?: string;
};

export function EmptyStateWrapper({ show, children, className }: EmptyStateWrapperProps) {
  if (!show) return null;

  return (
    <div
      className={className ?? 'rounded-lg border border-dashed p-4 text-sm text-muted-foreground'}
    >
      {children}
    </div>
  );
}
