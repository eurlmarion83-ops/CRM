"use client";

import { useState } from "react";
import { EmptyState } from "./dashboard-widget";

type AppointmentRow = {
  id: string;
  start: string;
  patientName: string;
  motifName: string;
  motifColor: string;
};

export function AppointmentTabs({ today, tomorrow }: { today: AppointmentRow[]; tomorrow: AppointmentRow[] }) {
  const [tab, setTab] = useState<"today" | "tomorrow">("today");
  const rows = tab === "today" ? today : tomorrow;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex border-b border-border text-sm">
        <button
          onClick={() => setTab("today")}
          className={`px-3 py-2 font-medium ${
            tab === "today" ? "border-b-2 border-warning text-warning" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Aujourd&apos;hui
        </button>
        <button
          onClick={() => setTab("tomorrow")}
          className={`px-3 py-2 font-medium ${
            tab === "tomorrow" ? "border-b-2 border-warning text-warning" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Demain
        </button>
      </div>
      <div className="flex-1 pt-3">
        {rows.length === 0 ? (
          <EmptyState>Aucun RDV {tab === "today" ? "aujourd'hui" : "demain"}</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {a.start} — {a.patientName}
                </span>
                <span className="rounded-full px-2 py-0.5 text-xs text-white" style={{ backgroundColor: a.motifColor }}>
                  {a.motifName}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
