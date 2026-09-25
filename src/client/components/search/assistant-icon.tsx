import { Bot } from 'lucide-react';

/** Ícone do assistente soltando ondas (ripple) — só o ícone "vive", não o botão inteiro, pra
    chamar atenção sem distrair do resto do controle. */
export function AssistantIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span className={`relative inline-flex ${className} shrink-0 items-center justify-center`}>
      <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-40" />
      <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-30 [animation-delay:0.5s]" />
      <Bot className={`relative ${className}`} />
    </span>
  );
}
