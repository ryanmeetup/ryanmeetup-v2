"use client";

import { useEffect, useState } from "react";
import { toast } from "@ryanmeetup/ui";
import { withAccessPreview } from "@/lib/access/access-preview";
import type {
  GoogleCalendarConnection,
  GoogleCalendarEvent,
} from "@/lib/calendar/google-calendar-types";
import { mutate, parseMutationResponse } from "@/lib/mutation-client";
import { errorMessage } from "@/lib/presentation";
import type { AccessPreview } from "@/lib/workspace/workspace-types";

const googleStatusMessages: Record<
  string,
  { kind: "success" | "error"; text: string }
> = {
  connected: { kind: "success", text: "Google Calendar connected." },
  invalid: {
    kind: "error",
    text: "That Google sign-in link expired. Please try again.",
  },
  auth: {
    kind: "error",
    text: "Sign in to Tasks again, then reconnect Google Calendar.",
  },
  unavailable: {
    kind: "error",
    text: "Google Calendar still needs one-time workspace setup.",
  },
  "refresh-token": {
    kind: "error",
    text: "Google did not grant ongoing calendar access. Please try again and approve the requested access.",
  },
  failed: {
    kind: "error",
    text: "Google Calendar could not be connected. Please try again.",
  },
};

export function useCalendarGoogle({
  accessPreview,
  canView,
  initialConnection,
  initialEvents,
  initialMonth,
  month,
  status,
}: {
  accessPreview: AccessPreview | undefined;
  canView: boolean;
  initialConnection: GoogleCalendarConnection;
  initialEvents: GoogleCalendarEvent[];
  initialMonth: string;
  month: string;
  status?: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [loadedMonth, setLoadedMonth] = useState(initialMonth);
  const [connection, setConnection] = useState(initialConnection);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const loading = canView && connection.connected && month !== loadedMonth;

  useEffect(() => {
    const message = status ? googleStatusMessages[status] : undefined;
    if (message) toast[message.kind](message.text);
  }, [status]);

  useEffect(() => {
    if (!canView || !connection.connected || month === loadedMonth) return;
    const controller = new AbortController();
    fetch(
      withAccessPreview(
        `/api/integrations/google-calendar/events?month=${encodeURIComponent(month)}`,
        accessPreview,
      ),
      { signal: controller.signal },
    )
      .then((response) =>
        parseMutationResponse<{ events: GoogleCalendarEvent[] }>(response),
      )
      .then((result) => {
        setEvents(result.events);
        setLoadedMonth(month);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadedMonth(month);
          toast.error(
            errorMessage(error, "Google Calendar could not be loaded."),
          );
        }
      });
    return () => controller.abort();
  }, [accessPreview, canView, connection.connected, loadedMonth, month]);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await mutate<{ disconnected: boolean }>(
        "/api/integrations/google-calendar/disconnect",
        { method: "POST", body: "{}" },
      );
      setConnection({ connected: false });
      setEvents([]);
      setSettingsOpen(false);
      toast.success("Google Calendar disconnected.");
    } catch (error) {
      toast.error(
        errorMessage(error, "Google Calendar could not be disconnected."),
      );
    } finally {
      setDisconnecting(false);
    }
  }

  return {
    connection,
    disconnect,
    disconnecting,
    events,
    loading,
    setEvents,
    setSettingsOpen,
    settingsOpen,
  };
}
