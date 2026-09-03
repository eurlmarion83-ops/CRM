"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PatientResult = { id: string; name: string; phone: string | null; email: string | null };

export function PatientQuickSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vide les résultats affichés quand la requête redevient trop courte
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      fetch(`/api/patients/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setResults(d.patients ?? []);
          setOpen(true);
        });
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="🔍 Rechercher un patient"
        className="w-full rounded-full border border-border bg-background px-4 py-1.5 text-sm"
      />
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setOpen(false);
                setQuery("");
                router.push(`/patients/${p.id}`);
              }}
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-light"
            >
              <span className="font-medium text-slate-900">{p.name}</span>
              <span className="text-xs text-slate-500">{p.phone || p.email || ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
