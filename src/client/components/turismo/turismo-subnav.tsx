import Link from 'next/link';
import { FOCUS_RING } from './turismo-media';

export type TurismoSubnavItem = { href: string; label: string };

/**
 * Atalhos entre as listas de turismo (rotas, dormir, comer...). Uma faixa de pílulas que rola na
 * horizontal no celular; `currentHref` marca a página atual (`aria-current`).
 */
export function TurismoSubnav({
  items,
  currentHref,
  label = 'Seções de turismo',
}: {
  items: TurismoSubnavItem[];
  currentHref?: string;
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav aria-label={label} className="-mx-5 sm:mx-0">
      <ul className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const current = item.href === currentHref;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-colors ${FOCUS_RING} ${
                  current
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background/80 text-foreground ring-1 ring-border hover:bg-background hover:ring-primary/50'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
