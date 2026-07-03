"use client";

import { useEffect, useId, useRef, useState } from "react";

type FilterSelectProps<T extends string> = {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
};

export function FilterSelect<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: FilterSelectProps<T>) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const selected = containerRef.current?.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]',
    );
    selected?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      const items = containerRef.current?.querySelectorAll<HTMLElement>(
        '[role="option"]',
      );
      if (!items || items.length === 0) return;

      const currentIndex = Array.from(items).indexOf(
        document.activeElement as HTMLElement,
      );

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        items[next]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        items[prev]?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectOption(nextValue: T) {
    onChange(nextValue);
    setOpen(false);
  }

  const triggerClassName = open
    ? "field-input flex w-full cursor-pointer items-center justify-between gap-2 border-stone-400 pr-3 ring-2 ring-brick/25"
    : "field-input flex w-full cursor-pointer items-center justify-between gap-2 pr-3";

  return (
    <div
      ref={containerRef}
      className="census-filter-field census-filter-field--select relative min-w-[11.5rem]"
    >
      <label htmlFor={id} className="field-label">
        {label}
      </label>

      <button
        id={id}
        type="button"
        className={triggerClassName}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate font-medium">
          {selectedOption?.label}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={
            open
              ? "h-4 w-4 shrink-0 rotate-180 text-stone-600 transition-transform duration-150"
              : "h-4 w-4 shrink-0 text-stone-400 transition-transform duration-150"
          }
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute top-[calc(100%+0.375rem)] right-0 left-0 z-50 overflow-hidden rounded-xl border border-stone-200/80 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={
                    isSelected
                      ? "flex w-full items-center justify-between gap-2 bg-brick/5 px-3.5 py-2.5 text-left text-sm font-medium text-brick transition hover:bg-brick/10 focus-visible:bg-brick/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brick/30"
                      : "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm text-stone-700 transition hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brick/30"
                  }
                  onClick={() => selectOption(option.value)}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden
                      className="h-4 w-4 shrink-0 text-brick"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
