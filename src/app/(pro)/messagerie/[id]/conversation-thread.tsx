"use client";

import { MessageThread } from "@/components/message-thread";
import { sendInternalMessageAction } from "../actions";

export function ConversationThread({ conversationId }: { conversationId: string }) {
  return (
    <MessageThread
      fetchUrl={`/api/messagerie/${conversationId}`}
      onSend={(content, attachment) => sendInternalMessageAction(conversationId, content, attachment)}
    />
  );
}
