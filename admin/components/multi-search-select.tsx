"use client";

import { useMemo, useState } from "react";

type Option = { id: string; label: string };

export function MultiSearchSelect({
  name,
  options,
  defaultValue = [],
  placeholder = "Ara ve ekle",
}: {
  name: string;
  options: Option[];
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const labels = useMemo(
    () => new Map(options.map((option) => [option.id, option.label])),
    [options]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return options.filter((option) => {
      if (selectedSet.has(option.id)) return false;
      if (!q) return true;
      return (
        option.label.toLocaleLowerCase("tr-TR").includes(q) ||
        option.id.toLocaleLowerCase("tr-TR").includes(q)
      );
    });
  }, [options, query, selectedSet]);

  const add = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setQuery("");
  };

  const remove = (id: string) => {
    setSelected((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div className="rounded-lg border border-input bg-background">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div className="flex flex-wrap items-center gap-1.5 p-2">
        {selected.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => remove(id)}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium"
          >
            {labels.get(id) ?? id}
            <span aria-hidden className="text-muted-foreground">
              ×
            </span>
          </button>
        ))}
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          placeholder={placeholder}
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        />
      </div>
      {open ? (
        <ul className="max-h-48 overflow-auto border-t border-border">
          {filtered.slice(0, 80).map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => add(option.id)}
                className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {option.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Sonuç yok</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
