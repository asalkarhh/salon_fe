import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/components/ui/select";

export interface SearchableSelectOption extends SelectOption {
  description?: string;
  searchText?: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  id?: string;
  name?: string;
  value?: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  onValueChange: (value: string) => void;
}

export function SearchableSelect({
  id,
  name,
  value = "",
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search options",
  emptyMessage = "No matches found.",
  disabled,
  className,
  onValueChange,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [
        option.label,
        option.description,
        option.searchText,
        ...(option.keywords ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [deferredSearch, options]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-2xl border border-input bg-white px-4 py-2 text-left text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60",
          open && "border-primary ring-4 ring-primary/10",
        )}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={cn("truncate pr-3", !selectedOption && "text-muted-foreground")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-[1.5rem] border border-border/70 bg-white shadow-panel">
          <div className="border-b border-border/70 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={search}
                placeholder={searchPlaceholder}
                className="flex h-11 w-full rounded-2xl border border-input bg-white px-11 py-2 pr-10 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (filteredOptions.length > 0) {
                      selectValue(filteredOptions[0].value);
                    }
                  }
                }}
              />
              {search ? (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          {value ? (
            <button
              type="button"
              className="w-full border-b border-border/70 px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground transition hover:bg-secondary/50"
              onClick={() => selectValue("")}
            >
              Clear selection
            </button>
          ) : null}

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-secondary/70",
                      isSelected && "bg-secondary/70",
                    )}
                    onClick={() => selectValue(option.value)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-6 text-sm text-muted-foreground">{emptyMessage}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
