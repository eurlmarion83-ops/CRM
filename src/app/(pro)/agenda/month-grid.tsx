"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addDays,
  format,
} from "date-fns";
import type { AgendaAppointment, AgendaPractitioner, AgendaTimeOff } from "./types";

export function MonthGrid({
  month,
  appointments,
  practitioners,
  timeOffs,
  onDayClick,
}: {
  month: Date;
  appointments: AgendaAppointment[];
  practitioners: AgendaPractitioner[];
  timeOffs: AgendaTimeOff[];
  onDayClick: (date: Date) => void;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const colorByPractitioner = new Map(practitioners.map((p) => [p.id, p.color]));

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
        <div key={d} className="bg-surface px-2 py-1 text-center text-xs font-medium text-slate-500">
          {d}
        </div>
      ))}
      {days.map((day) => {
        const dayAppts = appointments.filter((a) => isSameDay(new Date(a.start), day) && a.status === "CONFIRMED");
        const byPractitioner = new Map<string, number>();
        for (const a of dayAppts) byPractitioner.set(a.practitionerId, (byPractitioner.get(a.practitionerId) ?? 0) + 1);
        const dayHasTimeOff = timeOffs.some((t) => new Date(t.start) < addDays(day, 1) && new Date(t.end) > day);

        return (
          <button
            key={day.toISOString()}
            onClick={() => onDayClick(day)}
            className={`flex min-h-24 flex-col items-start gap-1 bg-surface p-2 text-left hover:bg-brand-light ${
              isSameMonth(day, month) ? "" : "text-slate-300"
            }`}
          >
            <span className="flex w-full items-center justify-between">
              <span className={`text-xs ${isSameDay(day, new Date()) ? "rounded-full bg-brand px-1.5 py-0.5 text-white" : ""}`}>
                {format(day, "d")}
              </span>
              {dayHasTimeOff && (
                <span
                  title="Absence ce jour-là"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "var(--text-faint)" }}
                />
              )}
            </span>
            {dayAppts.length > 0 && <span className="text-[10px] font-medium text-slate-600">{dayAppts.length} RDV</span>}
            <div className="flex flex-wrap gap-1">
              {[...byPractitioner.entries()].map(([pid, count]) => (
                <span
                  key={pid}
                  className="rounded-full px-1 text-[10px] text-white"
                  style={{ backgroundColor: colorByPractitioner.get(pid) ?? "#999" }}
                >
                  {count}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
