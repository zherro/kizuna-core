'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
/**
 * Searchable select component compatible with Formik.
 * Wraps a custom dropdown with optional keyword filtering on existing options.
 * Does NOT fetch remote data — filtering is in-memory only.
 */
export function SearchableSelect({ value, onChange, onBlur, options, placeholder = 'Selecione...', searchable = true, disabled = false, className, id, }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const searchRef = useRef(null);
    const selectedLabel = options.find((opt) => opt.value === value)?.label ?? '';
    const filtered = searchable && query.trim()
        ? options.filter((opt) => opt.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options;
    function openDropdown() {
        if (disabled)
            return;
        setOpen(true);
        setQuery('');
    }
    function closeDropdown() {
        setOpen(false);
        setQuery('');
        onBlur?.();
    }
    function select(optionValue) {
        onChange(optionValue);
        closeDropdown();
    }
    function clear(e) {
        e.stopPropagation();
        onChange('');
        onBlur?.();
    }
    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
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
    function handleKeyDown(e) {
        if (e.key === 'Escape')
            closeDropdown();
    }
    return (_jsxs("div", { ref: containerRef, className: cn('relative w-full', className), children: [_jsxs("button", { id: id, type: "button", role: "combobox", "aria-expanded": open, "aria-haspopup": "listbox", disabled: disabled, onClick: openDropdown, onKeyDown: handleKeyDown, className: cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors', 'focus-visible:ring-2 focus-visible:ring-ring', 'disabled:cursor-not-allowed disabled:opacity-50', open && 'ring-2 ring-ring', !value && 'text-muted-foreground'), children: [_jsx("span", { className: "truncate", children: value ? selectedLabel : placeholder }), _jsxs("span", { className: "flex shrink-0 items-center gap-1 pl-2", children: [value && !disabled ? (_jsx("span", { role: "button", "aria-label": "Limpar selecao", onClick: clear, className: "rounded p-0.5 text-muted-foreground hover:text-foreground", children: _jsx(X, { className: "h-3.5 w-3.5" }) })) : null, _jsx(ChevronDown, { className: cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180') })] })] }), open ? (_jsxs("div", { role: "listbox", className: cn('absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md', 'animate-in fade-in-0 zoom-in-95'), children: [searchable ? (_jsxs("div", { className: "flex items-center gap-2 border-b border-border px-3 py-2", children: [_jsx(Search, { className: "h-4 w-4 shrink-0 text-muted-foreground" }), _jsx("input", { ref: searchRef, value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Pesquisar...", className: "flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" }), query ? (_jsx("button", { type: "button", onClick: () => setQuery(''), className: "text-muted-foreground hover:text-foreground", children: _jsx(X, { className: "h-3.5 w-3.5" }) })) : null] })) : null, _jsx("ul", { className: "max-h-56 overflow-y-auto py-1", children: filtered.length === 0 ? (_jsx("li", { className: "px-3 py-2 text-sm text-muted-foreground", children: "Nenhum resultado." })) : (filtered.map((opt) => (_jsx("li", { role: "option", "aria-selected": opt.value === value, onClick: () => select(opt.value), className: cn('cursor-pointer px-3 py-2 text-sm transition-colors', opt.value === value
                                ? 'bg-primary/10 font-medium text-primary'
                                : 'text-foreground hover:bg-accent'), children: opt.label }, opt.value)))) })] })) : null] }));
}
//# sourceMappingURL=searchable-select.js.map