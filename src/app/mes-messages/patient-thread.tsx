"use client";

import { MessageThread } from "@/components/message-thread";
import { sendPatientMessageAction } from "./actions";

export function PatientThread() {
  return (
    <MessageThread
      fetchUrl="/api/mes-messages"
      onSend={(content) => sendPatientMessageAction(content)}
      placeholder="Écrire au cabinet..."
    />
  );
}
