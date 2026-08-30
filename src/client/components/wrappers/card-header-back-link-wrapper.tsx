import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '../ui/button';
import { CardHeader } from '../ui/card';
import { cn } from '../../../lib/utils';

type CardHeaderBackLinkWrapperProps = {
  href: string;
  label: string;
  className?: string;
};

export function CardHeaderBackLinkWrapper({
  href,
  label,
  className,
}: Readonly<CardHeaderBackLinkWrapperProps>) {
  return (
    <CardHeader
      className={cn(
        'border-b bg-gradient-to-br from-muted/70 via-background to-background',
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Link
          href={href}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          {label}
        </Link>
      </div>
    </CardHeader>
  );
}
