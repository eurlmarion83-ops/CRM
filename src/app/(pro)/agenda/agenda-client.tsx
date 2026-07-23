"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { MiniCalendar } from "./mini-calendar";
import { PractitionerFilter } from "./practitioner-filter";
import { DayGrid, WeekGrid } from "./time-grid";
import { MonthGrid } from "./month-grid";
import { ListView } from "./list-view";
import { NewAppointmentModal, AppointmentDetailModal } from "./appointment-modal";
import { FindSlotModal } from "./find-slot-modal";
import type { AgendaAppointment, AgendaMotif, AgendaPractitioner, AgendaView } from "./types";

const VIEWS: { key: AgendaView; label: string }[] = [
  { key: "liste", label: "Liste" },
  { key: "jour", label: "Journée" },
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
];

function getRange(view: AgendaView, date: Date) {
  if (view === "mois") return { from: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }), to: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }) };
  if (view === "jour") return { from: date, to: addDays(date, 1) };
  return { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) };
}

export function AgendaClient({
  practitioners,
  motifs,
  initialAppointments,
}: {
  practitioners: AgendaPractitioner[];
  motifs: AgendaMotif[];
  initialAppointments: AgendaAppointment[];
}) {
  const [view, setView] = useState<AgendaView>("semaine");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selected, setSelected] = useState<Set<string>>(new Set(practitioners.map((p) => p.id)));
  const [appointments, setAppointments] = useState<AgendaAppointment[]>(initialAppointments);
  const [loading, setLoading] = useState(false);

  const [newAppt, setNewAppt] = useState<{ practitionerId: string; start: Date; motifId?: string } | null>(null);
  const [viewAppt, setViewAppt] = useState<AgendaAppointment | null>(null);
  const [findSlotOpen, setFindSlotOpen] = useState(false);

  const range = useMemo(() => getRange(view, selectedDate), [view, selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- indicateur de chargement du fetch qui suit
    setLoading(true);
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      practitionerIds: [...selected].join(","),
    });
    fetch(`/api/agenda?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []))
      .finally(() => setLoading(false));
  }, [range.from, range.to, selected]);

  function refetch() {
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      practitionerIds: [...selected].join(","),
    });
    fetch(`/api/agenda?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []));
  }

  function navigate(dir: -1 | 1) {
    if (view === "mois") setSelectedDate((d) => addMonths(d, dir));
    else if (view === "jour") setSelectedDate((d) => addDays(d, dir));
    else setSelectedDate((d) => addWeeks(d, dir));
  }

  const weekFocusPractitioner = practitioners.find((p) => selected.has(p.id)) ?? practitioners[0];
  const selectedPractitioners = practitioners.filter((p) => selected.has(p.id));

  const label =
    view === "mois"
      ? format(selectedDate, "LLLL yyyy", { locale: fr })
      : view === "jour"
        ? format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
        : `${format(range.from, "d MMM", { locale: fr })} – ${format(addDays(range.to, -1), "d MMM yyyy", { locale: fr })}`;

  return (
    <div className="flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface p-4 lg:block">
        <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
        <PractitionerFilter practitioners={practitioners} selected={selected} onChange={setSelected} />
      </aside>

      <div className="flex-1 min-w-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="rounded-full border border-border px-2 py-1 hover:bg-brand-light">
              ‹
            </button>
            <h1 className="min-w-[200px] text-center text-lg font-semibold capitalize text-slate-900">{label}</h1>
            <button onClick={() => navigate(1)} className="rounded-full border border-border px-2 py-1 hover:bg-brand-light">
              ›
            </button>
            <button onClick={() => setSelectedDate(new Date())} className="rounded-full border border-border px-3 py-1 text-sm hover:bg-brand-light">
              Aujourd&apos;hui
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFindSlotOpen(true)}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              🔍 Trouver un créneau
            </button>
            <button onClick={() => window.print()} className="rounded-full border border-border px-3 py-2 text-sm hover:bg-brand-light">
              Imprimer / Exporter
            </button>
            <div className="flex rounded-full border border-border p-0.5 text-sm">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`rounded-full px-3 py-1 ${view === v.key ? "bg-brand text-white" : "hover:bg-brand-light"}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "semaine" && practitioners.length > 1 && (
          <p className="mt-2 text-xs text-slate-500">
            Vue semaine centrée sur <strong>{weekFocusPractitioner?.name}</strong>. Cochez un seul praticien pour changer le focus,
            ou utilisez la vue Jour pour comparer plusieurs agendas côte à côte.
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          {loading && <p className="mb-2 text-xs text-slate-400">Chargement…</p>}
          {view === "mois" && (
            <MonthGrid month={selectedDate} appointments={appointments} practitioners={practitioners} onDayClick={(d) => { setSelectedDate(d); setView("jour"); }} />
          )}
          {view === "jour" && (
            <DayGrid
              date={selectedDate}
              practitioners={selectedPractitioners}
              appointments={appointments}
              onSlotClick={(practitionerId, date) => setNewAppt({ practitionerId, start: date })}
              onAppointmentClick={setViewAppt}
            />
          )}
          {view === "semaine" && weekFocusPractitioner && (
            <WeekGrid
              weekStart={selectedDate}
              practitioner={weekFocusPractitioner}
              appointments={appointments}
              onSlotClick={(practitionerId, date) => setNewAppt({ practitionerId, start: date })}
              onAppointmentClick={setViewAppt}
            />
          )}
          {view === "liste" && <ListView appointments={appointments} onAppointmentClick={setViewAppt} />}
        </div>
      </div>

      {newAppt && (
        <NewAppointmentModal
          practitioner={practitioners.find((p) => p.id === newAppt.practitionerId)!}
          motifs={motifs.filter((m) => m.practitionerId === newAppt.practitionerId)}
          start={newAppt.start}
          initialMotifId={newAppt.motifId}
          onClose={() => {
            setNewAppt(null);
            refetch();
          }}
        />
      )}

      {viewAppt && <AppointmentDetailModal appt={viewAppt} onClose={() => { setViewAppt(null); refetch(); }} />}

      {findSlotOpen && (
        <FindSlotModal
          practitioners={practitioners}
          onClose={() => setFindSlotOpen(false)}
          onPickSlot={(slot) => {
            setFindSlotOpen(false);
            setNewAppt({ practitionerId: slot.practitionerId, start: new Date(slot.start), motifId: slot.motifId });
          }}
        />
      )}
    </div>
  );
}
