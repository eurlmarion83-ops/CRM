"use client";

import { useState } from "react";
import type { AgendaPractitioner } from "./types";

export function PractitionerFilter({
  practitioners,
  selected,
  onChange,
}: {
  practitioners: AgendaPractitioner[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = practitioners.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const allSelected = practitioners.every((p) => selected.has(p.id));

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase text-slate-500">Agendas</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un praticien"
        className="mt-2 w-full rounded-lg border border-border px-2 py-1 text-sm"
      />
      <label className="mt-2 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => onChange(allSelected ? new Set() : new Set(practitioners.map((p) => p.id)))}
        />
        Tous
      </label>
      <div className="mt-1 flex flex-col gap-1">
        {filtered.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => {
                const next = new Set(selected);
                if (next.has(p.id)) next.delete(p.id);
                else next.add(p.id);
                onChange(next);
              }}
            />
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
          </label>
        ))}
      </div>
    </div>
  );
}
