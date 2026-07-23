"use client";

import type { AgendaAppointment } from "./types";

export function ListView({
  appointments,
  onAppointmentClick,
}: {
  appointments: AgendaAppointment[];
  onAppointmentClick: (appt: AgendaAppointment) => void;
}) {
  const sorted = [...appointments].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const byDay = new Map<string, AgendaAppointment[]>();
  for (const appt of sorted) {
    const key = new Date(appt.start).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(appt);
  }

  if (sorted.length === 0) return <p className="p-4 text-sm text-slate-500">Aucun rendez-vous sur cette période.</p>;

  return (
    <div className="flex flex-col gap-4">
      {[...byDay.entries()].map(([day, items]) => (
        <div key={day}>
          <p className="text-xs font-semibold uppercase text-slate-500 capitalize">{day}</p>
          <div className="mt-1 flex flex-col gap-1">
            {items.map((a) => (
              <button
                key={a.id}
                onClick={() => onAppointmentClick(a)}
                className={`flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-brand ${
                  a.status !== "CONFIRMED" ? "opacity-50" : ""
                }`}
              >
                <span className="w-14 shrink-0 font-medium">
                  {new Date(a.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.motifColor }} />
                <span className="flex-1">{a.patientName}</span>
                <span className="text-slate-500">{a.motifName}</span>
                <span className="text-xs" style={{ color: a.practitionerColor }}>
                  {a.practitionerName}
                </span>
                {a.isVideo && <span>🎥</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
