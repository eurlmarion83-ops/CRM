"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";

export function MiniCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const [cursor, setCursor] = useState(startOfMonth(selectedDate));
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });
  const today = new Date();

  return (
    <div className="text-sm">
      <div className="flex items-center justify-between">
        <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded px-2 hover:bg-brand-light" aria-label="Mois précédent">
          ‹
        </button>
        <span className="font-medium capitalize">{format(cursor, "LLLL yyyy", { locale: fr })}</span>
        <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded px-2 hover:bg-brand-light" aria-label="Mois suivant">
          ›
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isCurrentMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                onSelect(day);
                setCursor(startOfMonth(day));
              }}
              className={`aspect-square rounded-full text-xs ${
                isSelected
                  ? "bg-brand text-white"
                  : isToday
                    ? "border border-brand text-brand-dark"
                    : isCurrentMonth
                      ? "hover:bg-brand-light"
                      : "text-slate-300 hover:bg-brand-light"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onSelect(new Date())}
        className="mt-2 w-full rounded-lg border border-border py-1 text-xs hover:bg-brand-light"
      >
        Aujourd&apos;hui
      </button>
    </div>
  );
}
