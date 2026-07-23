"use client";

import { useEffect, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { AgendaAppointment, AgendaPractitioner } from "./types";

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 20;
const PX_PER_MIN = 1.1;
const TOTAL_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;

function minutesFromDayStart(date: Date) {
  return (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes();
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
      className={`absolute left-0.5 right-0.5 overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[11px] text-white shadow-sm ${
        cancelled ? "opacity-40 line-through" : ""
      }`}
      style={{ top, height, backgroundColor: appt.motifColor }}
      title={`${appt.patientName} — ${appt.motifName}`}
    >
      <span className="font-medium">{format(start, "HH:mm")}</span> {appt.patientName}
      {appt.isVideo && " 🎥"}
    </button>
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

export function DayGrid({
  date,
  practitioners,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: {
  date: Date;
  practitioners: AgendaPractitioner[];
  appointments: AgendaAppointment[];
  onSlotClick: (practitionerId: string, date: Date) => void;
  onAppointmentClick: (appt: AgendaAppointment) => void;
}) {
  return (
    <div className="flex">
      <HourRuler />
      <div className="relative flex flex-1" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
        {practitioners.map((p) => {
          const dayAppts = appointments.filter((a) => a.practitionerId === p.id && isSameDay(new Date(a.start), date));
          return (
            <div key={p.id} className="relative flex-1 border-l border-border">
              <div className="sticky top-0 z-20 border-b border-border bg-surface px-2 py-1 text-xs font-medium" style={{ color: p.color }}>
                {p.name}
              </div>
              <div
                className="relative cursor-pointer"
                style={{ height: TOTAL_MIN * PX_PER_MIN }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = Math.round(((e.clientY - rect.top) / PX_PER_MIN) / 15) * 15;
                  const clicked = new Date(date);
                  clicked.setHours(DAY_START_HOUR, 0, 0, 0);
                  clicked.setMinutes(clicked.getMinutes() + minutes);
                  onSlotClick(p.id, clicked);
                }}
              >
                {Array.from({ length: (DAY_END_HOUR - DAY_START_HOUR) * 2 }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-border/60" style={{ top: i * 30 * PX_PER_MIN }} />
                ))}
                {isSameDay(date, new Date()) && <NowLine />}
                {dayAppts.map((appt) => (
                  <AppointmentBlock key={appt.id} appt={appt} onClick={() => onAppointmentClick(appt)} />
                ))}
              </div>
            </div>
          );
        })}
        {practitioners.length === 0 && <p className="p-4 text-sm text-slate-500">Sélectionnez au moins un praticien.</p>}
      </div>
    </div>
  );
}

export function WeekGrid({
  weekStart,
  practitioner,
  appointments,
  onSlotClick,
  onAppointmentClick,
}: {
  weekStart: Date;
  practitioner: AgendaPractitioner;
  appointments: AgendaAppointment[];
  onSlotClick: (practitionerId: string, date: Date) => void;
  onAppointmentClick: (appt: AgendaAppointment) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(weekStart, { weekStartsOn: 1 }), i));

  return (
    <div className="flex">
      <HourRuler />
      <div className="relative flex flex-1" style={{ height: TOTAL_MIN * PX_PER_MIN }}>
        {days.map((day) => {
          const dayAppts = appointments.filter((a) => a.practitionerId === practitioner.id && isSameDay(new Date(a.start), day));
          return (
            <div key={day.toISOString()} className="relative flex-1 border-l border-border">
              <div className="sticky top-0 z-20 border-b border-border bg-surface px-2 py-1 text-center text-xs font-medium capitalize">
                {format(day, "EEE d", { locale: fr })}
              </div>
              <div
                className="relative cursor-pointer"
                style={{ height: TOTAL_MIN * PX_PER_MIN }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = Math.round(((e.clientY - rect.top) / PX_PER_MIN) / 15) * 15;
                  const clicked = new Date(day);
                  clicked.setHours(DAY_START_HOUR, 0, 0, 0);
                  clicked.setMinutes(clicked.getMinutes() + minutes);
                  onSlotClick(practitioner.id, clicked);
                }}
              >
                {Array.from({ length: (DAY_END_HOUR - DAY_START_HOUR) * 2 }).map((_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-border/60" style={{ top: i * 30 * PX_PER_MIN }} />
                ))}
                {isSameDay(day, new Date()) && <NowLine />}
                {dayAppts.map((appt) => (
                  <AppointmentBlock key={appt.id} appt={appt} onClick={() => onAppointmentClick(appt)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
