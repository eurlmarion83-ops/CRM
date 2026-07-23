"use client";

import { useActionState } from "react";
import { cancelAppointmentAction } from "./actions";

export function CancelButton({ appointmentId, token }: { appointmentId: string; token?: string }) {
  const [state, formAction, pending] = useActionState(cancelAppointmentAction, undefined);

  if (state?.success) {
    return <p className="text-sm font-medium text-success">Rendez-vous annulé.</p>;
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      {token && <input type="hidden" name="token" value={token} />}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger hover:text-white disabled:opacity-60"
      >
        {pending ? "Annulation..." : "Annuler ce rendez-vous"}
      </button>
    </form>
  );
}
