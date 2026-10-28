import type { LucideIcon } from 'lucide-react';

export const FOCUS_RING =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Fundo quente (laranja do tema para o âmbar) para quem ainda não tem foto. */
const WARM_WASH =
  'linear-gradient(150deg, color-mix(in oklch, var(--primary) 78%, white) 0%, color-mix(in oklch, var(--accent) 88%, white) 100%)';

/** Preenche o pai (relative + overflow-hidden): foto de capa, ou o fundo quente com o ícone. */
export function TurismoMedia({ src, icon: Icon }: { src?: string | null; icon: LucideIcon }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fotos estáticas do conteúdo, tamanhos variados
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-0 grid place-items-center" style={{ backgroundImage: WARM_WASH }}>
      <Icon strokeWidth={1.25} className="h-10 w-10 text-white/90" />
    </div>
  );
}
