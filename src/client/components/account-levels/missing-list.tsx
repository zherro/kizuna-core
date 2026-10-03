import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { MissingItem } from '../../../shared/account-levels';
import { cn } from '../../../lib/utils';

/**
 * O que falta para um nível, cada item com link para onde se resolve (`href` vem de
 * `accountLevels.missingLinks` / `DEFAULT_MISSING_LINKS`). Item sem `href` vira texto.
 */
export function MissingList({ items, className }: { items: MissingItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn('mt-2 text-xs text-muted-foreground', className)}>
      <p>Falta:</p>
      <ul className="mt-1 space-y-1">
        {items.map((m) => (
          <li key={m.key}>
            {m.href ? (
              <Link
                href={m.href}
                className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-4 hover:underline"
              >
                {m.label}
                <ChevronRight className="h-3 w-3" />
              </Link>
            ) : (
              <span>• {m.label}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
