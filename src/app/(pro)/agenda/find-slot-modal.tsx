"use client";

import { useState } from "react";
import type { AgendaPractitioner } from "./types";

type SlotResult = {
  start: string;
  end: string;
  practitionerId: string;
  practitionerName: string;
  motifId: string;
  motifName: string;
};

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 0, label: "Dim" },
];

export function FindSlotModal({
  practitioners,
  onClose,
  onPickSlot,
}: {
  practitioners: AgendaPractitioner[];
  onClose: () => void;
  onPickSlot: (slot: SlotResult) => void;
}) {
  const [selectedPractitioners, setSelectedPractitioners] = useState<Set<string>>(new Set(practitioners.map((p) => p.id)));
  const [motifType, setMotifType] = useState("");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [results, setResults] = useState<SlotResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("practitionerIds", [...selectedPractitioners].join(","));
    if (motifType) params.set("motifType", motifType);
    if (weekdays.size > 0) params.set("weekdays", [...weekdays].join(","));
    if (timeStart) params.set("timeStart", timeStart);
    if (timeEnd) params.set("timeEnd", timeEnd);
    const res = await fetch(`/api/find-slots?${params.toString()}`);
    const data = await res.json();
    setResults(data.slots ?? []);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Trouver un créneau</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium">Praticien(s)</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {practitioners.map((p) => (
                <label key={p.id} className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={selectedPractitioners.has(p.id)}
                    onChange={() => {
                      const next = new Set(selectedPractitioners);
                      if (next.has(p.id)) next.delete(p.id);
                      else next.add(p.id);
                      setSelectedPractitioners(next);
                    }}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1">
            Type de consultation
            <select value={motifType} onChange={(e) => setMotifType(e.target.value)} className="rounded-lg border border-border px-3 py-2">
              <option value="">Tous types</option>
              <option value="CABINET">Cabinet</option>
              <option value="DOMICILE">Visite à domicile</option>
              <option value="VIDEO">Téléconsultation</option>
            </select>
          </label>

          <div>
            <p className="font-medium">Jours acceptés</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <label key={d.value} className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
                  <input
                    type="checkbox"
                    checked={weekdays.has(d.value)}
                    onChange={() => {
                      const next = new Set(weekdays);
                      if (next.has(d.value)) next.delete(d.value);
                      else next.add(d.value);
                      setWeekdays(next);
                    }}
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              Après
              <input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              Avant
              <input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="rounded-lg border border-border px-3 py-2" />
            </label>
          </div>

          <button
            onClick={search}
            disabled={loading}
            className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Recherche..." : "Rechercher les prochains créneaux"}
          </button>

          {results && (
            <div className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-border">
              {results.length === 0 && <p className="p-3 text-slate-500">Aucun créneau trouvé.</p>}
              {results.map((s) => (
                <button
                  key={`${s.practitionerId}-${s.start}`}
                  onClick={() => onPickSlot(s)}
                  className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left last:border-0 hover:bg-brand-light"
                >
                  <span>
                    {new Date(s.start).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-slate-500">
                    {s.practitionerName} — {s.motifName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
