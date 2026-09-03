"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { createAppointmentAction, cancelAppointmentStaffAction, rescheduleAppointmentAction } from "./actions";
import type { AgendaAppointment, AgendaMotif, AgendaPractitioner } from "./types";

type PatientHit = { id: string; name: string; phone: string | null; email: string | null };

function MotifPicker({
  motifs,
  selected,
  onSelect,
}: {
  motifs: AgendaMotif[];
  selected?: AgendaMotif;
  onSelect: (motifId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const filtered = motifs.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left"
      >
        {selected && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />}
        <span className="flex-1 truncate">
          {selected ? `${selected.name} (${selected.durationMin} min)` : "Sélectionner un motif"}
        </span>
        <span className="text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un motif..."
            className="w-full border-b border-border px-3 py-2 text-sm"
          />
          <div className="max-h-56 overflow-y-auto">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  onSelect(m.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-light"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="flex-1 truncate">{m.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {m.durationMin} min{m.type === "VIDEO" ? " 🎥" : ""}
                </span>
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-sm text-slate-500">Aucun motif trouvé.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function NewAppointmentModal({
  practitioner,
  motifs,
  start,
  initialMotifId,
  onClose,
}: {
  practitioner: AgendaPractitioner;
  motifs: AgendaMotif[];
  start: Date;
  initialMotifId?: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(createAppointmentAction, undefined);
  const [motifId, setMotifId] = useState(initialMotifId ?? motifs[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientHit | null>(null);
  const selectedMotif = motifs.find((m) => m.id === motifId);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  useEffect(() => {
    if (query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vide les résultats quand la recherche est trop courte
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      fetch(`/api/patients/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => setHits(d.patients ?? []));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  return (
    <Modal onClose={onClose} title={`Nouveau rendez-vous — ${practitioner.name}`}>
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="practitionerId" value={practitioner.id} />
        <input type="hidden" name="start" value={start.toISOString()} />
        {selectedPatient && <input type="hidden" name="patientId" value={selectedPatient.id} />}

        <p className="text-sm text-slate-600">
          {start.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à{" "}
          {start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>

        <input type="hidden" name="motifId" value={motifId} />
        <label className="flex flex-col gap-1 text-sm">
          Motif
          <MotifPicker motifs={motifs} selected={selectedMotif} onSelect={setMotifId} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Patient
          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span>{selectedPatient.name}</span>
              <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-brand-dark underline">
                Changer
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un patient existant..."
                className="w-full rounded-lg border border-border px-3 py-2"
              />
              {hits.length > 0 && (
                <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                  {hits.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setSelectedPatient(h);
                        setHits([]);
                        setQuery("");
                      }}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-light"
                    >
                      {h.name} {h.phone ? `— ${h.phone}` : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </label>

        {!selectedPatient && (
          <>
            <p className="text-xs text-slate-500">Ou créez un nouveau patient :</p>
            <div className="grid grid-cols-2 gap-2">
              <input name="firstName" placeholder="Prénom" className="rounded-lg border border-border px-3 py-2" />
              <input name="lastName" placeholder="Nom" className="rounded-lg border border-border px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="phone" placeholder="Téléphone" className="rounded-lg border border-border px-3 py-2" />
              <input name="email" placeholder="Email" className="rounded-lg border border-border px-3 py-2" />
            </div>
          </>
        )}

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "Création..." : "Créer le rendez-vous"}
        </button>
      </form>
    </Modal>
  );
}

export function AppointmentDetailModal({ appt, onClose }: { appt: AgendaAppointment; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [rescheduling, setRescheduling] = useState(false);
  const [newStart, setNewStart] = useState(appt.start.slice(0, 16));

  return (
    <Modal onClose={onClose} title={appt.motifName}>
      <div className="flex flex-col gap-2 text-sm">
        <p>
          <span className="font-medium">Patient : </span>
          {appt.patientName} {appt.patientPhone ? `(${appt.patientPhone})` : ""}
        </p>
        <p>
          <span className="font-medium">Praticien : </span>
          {appt.practitionerName}
        </p>
        <p>
          <span className="font-medium">Créneau : </span>
          {new Date(appt.start).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
        </p>
        <p>
          <span className="font-medium">Statut : </span>
          {appt.status}
        </p>
        {appt.isVideo && appt.roomName && (
          <a href={`/consultation/${appt.roomName}`} className="text-brand-dark underline">
            Rejoindre la téléconsultation
          </a>
        )}
      </div>

      {appt.status === "CONFIRMED" && (
        <div className="mt-4 flex flex-col gap-2">
          {rescheduling ? (
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="flex-1 rounded-lg border border-border px-2 py-1 text-sm"
              />
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await rescheduleAppointmentAction(appt.id, new Date(newStart).toISOString());
                    onClose();
                  })
                }
                className="rounded-full bg-brand px-3 py-1 text-sm text-white hover:bg-brand-dark"
              >
                Valider
              </button>
            </div>
          ) : (
            <button onClick={() => setRescheduling(true)} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-brand-light">
              Reporter
            </button>
          )}
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() => startTransition(async () => { await cancelAppointmentStaffAction(appt.id, "NO_SHOW"); onClose(); })}
              className="rounded-full border border-warning px-3 py-1.5 text-sm text-warning hover:bg-warning hover:text-white"
            >
              Marquer absent (no-show)
            </button>
            <button
              disabled={isPending}
              onClick={() => startTransition(async () => { await cancelAppointmentStaffAction(appt.id, "CANCELLED"); onClose(); })}
              className="rounded-full border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
