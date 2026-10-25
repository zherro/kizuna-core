'use client';

import { MapPin, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AssistantIcon } from './assistant-icon';

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  /** Enter ou clique em "Buscar". Recebe o texto como está no campo (sem trim). */
  onSubmit: (value: string) => void;
  placeholder?: string;
  /** Chip de localização (só desktop). Sem rótulo, o chip não aparece. */
  locationLabel?: string;
  onLocationClick?: () => void;
  /** Tooltip do chip de localização. */
  locationTitle?: string;
  /** Botão do assistente de IA. Sem isto, o botão não aparece. */
  assistant?: { onClick: (value: string) => void };
  className?: string;
};

/**
 * Campo de busca em pílula (chip de localização, input, assistente e "Buscar"). Controlado e sem
 * roteamento: quem usa decide o que fazer no envio. Usado na /busca e na home.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'O que você procura?',
  locationLabel,
  onLocationClick,
  locationTitle = 'Trocar localização',
  assistant,
  className,
}: SearchBarProps) {
  return (
    <form
      className={cn(
        'flex items-center gap-1.5 rounded-full border-2 border-primary/40 bg-background p-1.5 shadow-md sm:gap-2 sm:p-2 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15',
        className
      )}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      {locationLabel ? (
        <button
          type="button"
          onClick={onLocationClick}
          aria-label="Trocar localização"
          title={locationTitle}
          className="hidden h-12 shrink-0 items-center gap-1 rounded-full bg-muted px-3 text-xs font-medium text-foreground transition hover:bg-muted/70 sm:inline-flex"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[9rem] truncate">{locationLabel}</span>
        </button>
      ) : null}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
        className="h-12 min-w-0 flex-1 text-ellipsis bg-transparent px-2 text-base sm:px-3 outline-none placeholder:text-muted-foreground/70"
      />
      {assistant ? (
        <button
          type="button"
          onClick={() => assistant.onClick(value)}
          aria-label="Falar com o assistente"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary/20"
        >
          <AssistantIcon className="h-[30px] w-[30px]" />
        </button>
      ) : null}
      <button
        type="submit"
        aria-label="Buscar"
        className="h-12 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:px-5"
      >
        <Search className="h-4 w-4 sm:hidden" />
        <span className="hidden sm:inline">Buscar</span>
      </button>
    </form>
  );
}
