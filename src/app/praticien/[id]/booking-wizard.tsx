"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { bookAction, joinWaitlistAction } from "./actions";
import { MOTIF_TYPE_LABELS, type MotifType } from "@/lib/enums";

type Motif = {
  id: string;
  name: string;
  color: string;
  durationMin: number;
  type: MotifType;
};

type SlotDTO = { start: string; end: string };

export function BookingWizard({
  practitionerId,
  motifs,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  defaultPhone,
}: {
  practitionerId: string;
  motifs: Motif[];
  defaultFirstName?: string;
  defaultLastName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}) {
  const [motifId, setMotifId] = useState<string>(motifs[0]?.id ?? "");
  const [slots, setSlots] = useState<SlotDTO[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotDTO | null>(null);
  const [state, formAction, pending] = useActionState(bookAction, undefined);
  const [waitlistState, waitlistAction, waitlistPending] = useActionState(joinWaitlistAction, undefined);

  useEffect(() => {
    if (!motifId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- indicateur de chargement du fetch qui suit
    setLoadingSlots(true);
    setSelectedSlot(null);
    fetch(`/api/slots?practitionerId=${practitionerId}&motifId=${motifId}&days=21`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots ?? []))
      .finally(() => setLoadingSlots(false));
  }, [motifId, practitionerId]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, SlotDTO[]>();
    for (const slot of slots) {
      const day = new Date(slot.start).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(slot);
    }
    return map;
  }, [slots]);

  const selectedMotif = motifs.find((m) => m.id === motifId);

  if (motifs.length === 0) {
    return (
      <p className="card p-4 text-sm text-slate-600">
        Ce praticien n&apos;a pas encore ouvert de motif à la réservation en ligne.
      </p>
    );
  }

  return (
    <div className="card p-6 flex flex-col gap-6">
      <div>
        <h2 className="font-semibold text-slate-900">1. Choisissez un motif de consultation</h2>
        <div className="mt-3 flex flex-col gap-2">
          {motifs.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                motifId === m.id ? "border-brand bg-brand-light" : "border-border"
              }`}
            >
              <input
                type="radio"
                name="motif"
                checked={motifId === m.id}
                onChange={() => setMotifId(m.id)}
              />
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="flex-1">{m.name}</span>
              <span className="text-xs text-slate-500">
                {m.durationMin} min · {MOTIF_TYPE_LABELS[m.type]}
                {m.type === "VIDEO" ? " 🎥" : ""}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-slate-900">2. Choisissez un créneau</h2>
        {loadingSlots && <p className="mt-2 text-sm text-slate-500">Recherche des créneaux disponibles...</p>}
        {!loadingSlots && slots.length === 0 && (
          <div className="mt-2">
            <p className="text-sm text-slate-500">Aucun créneau disponible dans les 3 prochaines semaines.</p>
            {waitlistState?.success ? (
              <p className="mt-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                Vous êtes inscrit(e) sur la liste d&apos;attente : nous vous préviendrons dès qu&apos;une place se libère.
              </p>
            ) : (
              <form action={waitlistAction} className="mt-3 flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-slate-800">Rejoindre la liste d&apos;attente</p>
                <input type="hidden" name="practitionerId" value={practitionerId} />
                <input type="hidden" name="motifId" value={motifId} />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="firstName"
                    placeholder="Prénom"
                    defaultValue={defaultFirstName}
                    required
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <input
                    name="lastName"
                    placeholder="Nom"
                    defaultValue={defaultLastName}
                    required
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  defaultValue={defaultEmail}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Téléphone mobile (notification SMS)"
                  defaultValue={defaultPhone}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-slate-500">
                    Au plus tôt (facultatif)
                    <input type="date" name="preferredFrom" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
                  </label>
                  <label className="text-xs text-slate-500">
                    Au plus tard (facultatif)
                    <input type="date" name="preferredTo" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
                  </label>
                </div>
                {waitlistState?.error && <p className="text-sm text-danger">{waitlistState.error}</p>}
                <button
                  type="submit"
                  disabled={waitlistPending}
                  className="rounded-full border border-brand px-4 py-2 text-sm font-medium text-brand-dark hover:bg-brand-light disabled:opacity-60"
                >
                  {waitlistPending ? "Inscription..." : "Être prévenu(e) si une place se libère"}
                </button>
              </form>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
          {[...slotsByDay.entries()].map(([day, daySlots]) => (
            <div key={day}>
              <p className="text-xs font-medium capitalize text-slate-500">{day}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {daySlots.map((s) => (
                  <button
                    type="button"
                    key={s.start}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-lg border px-3 py-1 text-sm ${
                      selectedSlot?.start === s.start
                        ? "border-brand bg-brand text-white"
                        : "border-border hover:border-brand"
                    }`}
                  >
                    {new Date(s.start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSlot && selectedMotif && (
        <div>
          <h2 className="font-semibold text-slate-900">3. Vos coordonnées</h2>
          <form action={formAction} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="practitionerId" value={practitionerId} />
            <input type="hidden" name="motifId" value={motifId} />
            <input type="hidden" name="start" value={selectedSlot.start} />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="firstName"
                placeholder="Prénom"
                defaultValue={defaultFirstName}
                required
                className="rounded-lg border border-border px-3 py-2"
              />
              <input
                name="lastName"
                placeholder="Nom"
                defaultValue={defaultLastName}
                required
                className="rounded-lg border border-border px-3 py-2"
              />
            </div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              defaultValue={defaultEmail}
              className="rounded-lg border border-border px-3 py-2"
            />
            <input
              type="tel"
              name="phone"
              placeholder="Téléphone mobile (rappel SMS)"
              defaultValue={defaultPhone}
              className="rounded-lg border border-border px-3 py-2"
            />
            <textarea
              name="notes"
              placeholder="Motif détaillé (facultatif)"
              className="rounded-lg border border-border px-3 py-2"
              rows={2}
            />
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending
                ? "Confirmation..."
                : `Confirmer le RDV du ${new Date(selectedSlot.start).toLocaleDateString("fr-FR")} à ${new Date(
                    selectedSlot.start
                  ).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
