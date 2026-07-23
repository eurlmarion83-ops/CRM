import { createEvent, type DateArray } from "ics";

function toDateArray(d: Date): DateArray {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
}

export function buildAppointmentIcs(params: {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
}): string {
  const { error, value } = createEvent({
    uid: params.uid,
    title: params.title,
    description: params.description,
    location: params.location,
    start: toDateArray(params.start),
    end: toDateArray(params.end),
    status: "CONFIRMED",
  });
  if (error || !value) throw error ?? new Error("Impossible de générer le fichier .ics");
  return value;
}
