'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type SelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  /** Current value (controlled). */
  value: string;
  /** Called when selection changes. */
  onChange: (value: string) => void;
  /** Called on blur — use `formik.handleBlur` equivalent. */
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  /** Whether to show a search input inside the dropdown. Default: true. */
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  /** html id — useful for <Label htmlFor=...>. */
  id?: string;
};

/**
 * Searchable select component compatible with Formik.
 * Wraps a custom dropdown with optional keyword filtering on existing options.
 * Does NOT fetch remote data — filtering is in-memory only.
 */
export function SearchableSelect({
  value,
  onChange,
  onBlur,
  options,
  placeholder = 'Selecione...',
  searchable = true,
  disabled = false,
  className,
  id,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? '';

  const filtered =
    searchable && query.trim()
      ? options.filter((opt) => opt.label.toLowerCase().includes(query.trim().toLowerCase()))
      : options;

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery('');
  }

  function closeDropdown() {
    setOpen(false);
    setQuery('');
    onBlur?.();
  }

  function select(optionValue: string) {
    onChange(optionValue);
    closeDropdown();
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    onBlur?.();
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable) {
      const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open, searchable]);

  // Keyboard navigation: close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') closeDropdown();
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={openDropdown}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-2 ring-ring',
          !value && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{value ? selectedLabel : placeholder}</span>

        <span className="flex shrink-0 items-center gap-1 pl-2">
          {value && !disabled ? (
            <span
              role="button"
              aria-label="Limpar selecao"
              onClick={clear}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>

      {/* Dropdown */}
      {open ? (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md',
            'animate-in fade-in-0 zoom-in-95'
          )}
        >
          {/* Search input */}
          {searchable ? (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Options list */}
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum resultado.</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => select(opt.value)}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm transition-colors',
                    opt.value === value
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-foreground hover:bg-accent'
                  )}
                >
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
