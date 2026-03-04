import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useDebouncedValue } from '@/lib/use-debounced-value';

interface ComboboxItem {
  id: string;
  label: string;
}

interface SearchComboboxProps {
  label?: string;
  placeholder?: string;
  value: ComboboxItem | null;
  onSelect: (item: ComboboxItem | null) => void;
  searchFn: (query: string) => Promise<ComboboxItem[]>;
  error?: string;
}

function SearchCombobox({
  label,
  placeholder = 'Buscar...',
  value,
  onSelect,
  searchFn,
  error,
}: SearchComboboxProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search-combobox', debouncedSearch, label],
    queryFn: () => searchFn(debouncedSearch),
    enabled: debouncedSearch.length >= 1,
    staleTime: 10_000,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: ComboboxItem) => {
    onSelect(item);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const showDropdown =
    open && debouncedSearch.length >= 1 && results && results.length > 0;

  const inputId = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}

      {value ? (
        <div
          className={cn(
            'flex h-11 items-center justify-between rounded-xl border border-border bg-surface px-4',
            error && 'border-danger',
          )}
        >
          <span className="truncate text-sm text-text">{value.label}</span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <X className="h-3 w-3" />
            Cambiar
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn(
              'h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-4 text-sm text-text transition-all duration-200',
              'placeholder:text-text-muted',
              'hover:border-slate-400',
              'focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10',
              error &&
                'border-danger hover:border-danger focus:border-danger focus:ring-danger/10',
            )}
          />
          {isFetching && (
            <div className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          )}

          {showDropdown && (
            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-border-light bg-surface shadow-card">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {open &&
            debouncedSearch.length >= 1 &&
            results &&
            results.length === 0 &&
            !isFetching && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-border-light bg-surface px-4 py-3 shadow-card">
                <p className="text-sm text-text-muted">Sin resultados</p>
              </div>
            )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export { SearchCombobox };
export type { SearchComboboxProps, ComboboxItem };
