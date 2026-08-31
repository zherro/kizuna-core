import { HelpCircle } from 'lucide-react';
import { resolveLucideIcon } from '@kizuna/core/lib/utils';
import { cn } from '@kizuna/core/lib/utils';

type TaxonomyIconProps = {
  icon: string | null | undefined;
  className?: string;
};

export function TaxonomyIcon({ icon, className }: Readonly<TaxonomyIconProps>) {
  const Icon = resolveLucideIcon(icon) ?? HelpCircle;
  return <Icon className={cn('h-4 w-4', className)} aria-hidden="true" />;
}
