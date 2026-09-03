"use client";

import { useEffect, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { AgendaAppointment, AgendaPractitioner, AgendaTimeOff } from "./types";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const PX_PER_MIN = 1.1;
const TOTAL_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;

function minutesFromDayStart(date: Date) {
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes();
}

function minutesFromOffsetY(offsetY: number) {
  return Math.round(offsetY / PX_PER_MIN / 15) * 15;
}

function NowLine() {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const mins = minutesFromDayStart(now);
      setTop(mins >= 0 && mins <= TOTAL_MIN ? mins * PX_PER_MIN : null);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);
  if (top === null) return null;
  return <div className="absolute left-0 right-0 z-10 border-t-2 border-danger" style={{ top }} />;
}

function AppointmentBlock({ appt, onClick }: { appt: AgendaAppointment; onClick: () => void }) {
  const start = new Date(appt.start);
  const end = new Date(appt.end);
  const top = Math.max(0, minutesFromDayStart(start)) * PX_PER_MIN;
  const height = Math.max(20, (end.getTime() - start.getTime()) / 60000 * PX_PER_MIN);
  const cancelled = appt.status !== "CONFIRMED";

  return (
    <button
      onClick={onClick}
      draggable={!cancelled}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", appt.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] text-white shadow-sm ${
        cancelled ? "opacity-40 line-through" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{ top, height, backgroundColor: appt.motifColor }}
      title={`${appt.patientName} — ${appt.motifName}`}
    >
      <span className="font-medium">{format(start, "HH:mm")}</span> {appt.patientName}
      {appt.isVideo && " 🎥"}
    </button>
  );
}

function TimeOffBlock({ timeOff, date }: { timeOff: AgendaTimeOff; date: Date }) {
  const rawStart = new Date(timeOff.start);
  const rawEnd = new Date(timeOff.end);
  const dayStart = new Date(date);
  dayStart.setHours(DAY_START_HOUR, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(DAY_END_HOUR, 0, 0, 0);

  const start = rawStart < dayStart ? dayStart : rawStart;
  const end = rawEnd > dayEnd ? dayEnd : rawEnd;
  if (end <= start) return null;

  const top = Math.max(0, minutesFromDayStart(start)) * PX_PER_MIN;
  const height = Math.max(16, (end.getTime() - start.getTime()) / 60000) * PX_PER_MIN;

  return (
    <div
      className="absolute left-0 right-0 overflow-hidden border-y px-1.5 py-0.5 text-[11px]"
      style={{ top, height, backgroundColor: "var(--border)", borderColor: "var(--border)", color: "var(--text-muted)" }}
      title={timeOff.reason ?? "Absence"}
    >
      {timeOff.reason ? `Absence — ${timeOff.reason}` : "Absence"} {format(start, "HH:mm")}
    </div>
  );
}

function HourRuler() {
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
  return (
    <div className="relative w-12 shrink-0 text-right text-[11px] text-slate-400">
      {hours.map((h) => (
        <div key={h} style={{ position: "absolute", top: (h - DAY_START_HOUR) * 60 * PX_PER_MIN - 6, right: 4 }}>
          {h}:00
        </div>
      ))}
    </div>
  );
}

/** Colonne d'un praticien pour un jour donné : grille horaire, clic pour créer, glisser-déposer pour déplacer. */
function PractitionerDayColumn({
  date,
  practitioner,
  appointments,
  timeOffs,
  onSlotClick,
  onAppointmentClick,
  onAppointmentDrop,
  compact,
}: {
  date: Date;
  practitioner: AgendaPractitioner;
  appointments: AgendaAppointment[];
  timeOffs: AgendaTimeOff[];
  onSlotClick: (practitionerId: string, date: Date) => void;
  onAppointmentClick: (appt: AgendaAppointment) => void;
  onAppointmentDrop: (appointmentId: string, practitionerId: string, newStart: Date) => void;
  compact?: boolean;
}) {
  const dayAppts = appointments.filter((a) => a.practitionerId === practitioner.id && isSameDay(new Date(a.start), date));
  const dayTimeOffs = timeOffs.filter(
    (t) => t.practitionerId === practitioner.id && new Date(t.start) < addDays(date, 1) && new Date(t.end) > date
  );

  return (
    <div className="relative flex-1 border-l border-border">
      <div
        className={`sticky top-0 z-20 border-b border-border bg-surface px-2 py-1 text-xs font-medium ${compact ? "truncate" : ""}`}
        style={{ color: practitioner.color }}
      >
        {practitioner.name}
      </div>
      <div
        className="relative cursor-pointer"
        style={{ height: TOTAL_MIN * PX_PER_MIN }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const minutes = minutesFromOffsetY(e.clientY - rect.top);
          const clicked = new Date(date);
          clicked.setHours(DAY_START_HOUR, 0, 0, 0);
          clicked.setMinutes(clicked.getMinutes() + minutes);
          onSlotClick(practitioner.id, clicked);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const appointmentId = e.dataTransfer.getData("text/plain");
          if (!appointmentId) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const minutes = minutesFromOffsetY(e.clientY - rect.top);
          const newStart = new Date(date);
          newStart.setHours(DAY_START_HOUR, 0, 0, 0);
          newStart.setMinutes(newStart.getMinutes() + minutes);
          onAppointmentDrop(appointmentId, practitioner.id, newStart);
        }}
      >
        {Array.from({ length: (DAY_END_HOUR - DAY_START_HOUR) * 2 }).map((_, i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-border/60" style={{ top: i * 30 * PX_PER_MIN }} />
        ))}
        {isSameDay(date, new Date()) && <NowLine />}
        {dayTimeOffs.map((t) => (
          <TimeOffBlock key={t.id} timeOff={t} date={date} />
        ))}
        {dayAppts.map((appt) => (
          <AppointmentBlock key={appt.id} appt={appt} onClick={() => onAppointmentClick(appt)} />
        ))}
      </div>
    </div>
  );
}

export function DayGrid({
  date,
  practitioners,
  appointments,
  timeOffs,
  onSlotClick,
  onAppointmentClick,
  onAppointmentDrop,
}: {
  date: Date;
  practitioners: AgendaPractitioner[];
  appointments: AgendaAppointment[];
  timeOffs: AgendaTimeOff[];
  onSlotClick: (practitionerId: string, date: Date) => void;
  onAppointmentClick: (appt: AgendaAppointment) => void;
  onAppointmentDrop: (appointmentId: string, practitionerId: string, newStart: Date) => void;
}) {
  return (
    <div className="flex">
      <HourRuler />
      <div className="relative flex flex-1" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
        {practitioners.map((p) => (
          <PractitionerDayColumn
            key={p.id}
            date={date}
            practitioner={p}
            appointments={appointments}
            timeOffs={timeOffs}
            onSlotClick={onSlotClick}
            onAppointmentClick={onAppointmentClick}
            onAppointmentDrop={onAppointmentDrop}
          />
        ))}
        {practitioners.length === 0 && <p className="p-4 text-sm text-slate-500">Sélectionnez au moins un praticien.</p>}
      </div>
    </div>
  );
}

/**
 * Vue semaine multi-praticiens : 7 colonnes (jours), chaque colonne subdivisée en une
 * sous-colonne par praticien sélectionné (grille croisée jour × praticien).
 */
export function WeekGrid({
  weekStart,
  practitioners,
  appointments,
  timeOffs,
  onSlotClick,
  onAppointmentClick,
  onAppointmentDrop,
}: {
  weekStart: Date;
  practitioners: AgendaPractitioner[];
  appointments: AgendaAppointment[];
  timeOffs: AgendaTimeOff[];
  onSlotClick: (practitionerId: string, date: Date) => void;
  onAppointmentClick: (appt: AgendaAppointment) => void;
  onAppointmentDrop: (appointmentId: string, practitionerId: string, newStart: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), i));

  return (
    <div className="flex">
      <HourRuler />
      <div className="relative flex flex-1" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
        {days.map((day) => (
          <div key={day.toISOString()} className="flex flex-1 flex-col border-l border-border">
            <div className="sticky top-0 z-20 border-b border-border bg-surface px-2 py-1 text-center text-xs font-medium capitalize">
              {format(day, "EEE d", { locale: fr })}
            </div>
            <div className="flex flex-1">
              {practitioners.map((p) => (
                <PractitionerDayColumn
                  key={p.id}
                  date={day}
                  practitioner={p}
                  appointments={appointments}
                  timeOffs={timeOffs}
                  onSlotClick={onSlotClick}
                  onAppointmentClick={onAppointmentClick}
                  onAppointmentDrop={onAppointmentDrop}
                  compact
                />
              ))}
              {practitioners.length === 0 && <div className="flex-1" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
