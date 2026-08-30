import type { ReactNode } from 'react';
import Link from 'next/link';
import { buttonVariants, type ButtonProps } from '../ui/button';
import { cn } from '../../../lib/utils';

type PageHeaderAction = {
  href: string;
  label: string;
  icon?: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
};

type PageHeaderWrapperProps = {
  badge?: string;
  title: string;
  description?: string;
  action?: PageHeaderAction;
  className?: string;
};

export function PageHeaderWrapper({
  badge,
  title,
  description,
  action,
  className,
}: Readonly<PageHeaderWrapperProps>) {
  return (
    <section className={cn('rounded-2xl border border-border bg-card px-6 py-5', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {badge ? (
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">{badge}</p>
          ) : null}
          <h1 className={cn('text-2xl font-semibold tracking-tight', badge ? 'mt-2' : '')}>
            {title}
          </h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>

        {action ? (
          <Link
            href={action.href}
            className={cn(
              buttonVariants({
                variant: action.variant ?? 'default',
                size: action.size ?? 'default',
              }),
              'gap-2 self-start'
            )}
          >
            {action.icon}
            {action.label}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
