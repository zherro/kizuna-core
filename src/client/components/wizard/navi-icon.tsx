import { Bot } from 'lucide-react';

/** Ícone da Naví com ondas (ripple) — chama atenção sem distrair. Espelha AssistantIcon da busca. */
export function NaviIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className} shrink-0 items-center justify-center`}>
      <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-40" />
      <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30 [animation-delay:0.5s]" />
      <Bot className={`relative ${className}`} />
    </span>
  );
}
