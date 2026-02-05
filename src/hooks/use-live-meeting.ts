"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

interface LiveMeetingState {
  meeting: Meeting | null;
  agendaItems: AgendaItem[];
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
}

interface UseLiveMeetingOptions {
  meetingId: string;
  initialMeeting?: Meeting;
  initialAgendaItems?: AgendaItem[];
  pollIntervalMs?: number; // Fallback polling interval (default: 30000)
  enabled?: boolean;
}

interface UseLiveMeetingReturn extends LiveMeetingState {
  refresh: () => Promise<void>;
}

/**
 * Hook for real-time meeting updates using Supabase Realtime
 * with automatic polling fallback when WebSocket disconnects
 */
export function useLiveMeeting({
  meetingId,
  initialMeeting,
  initialAgendaItems = [],
  pollIntervalMs = 30000,
  enabled = true,
}: UseLiveMeetingOptions): UseLiveMeetingReturn {
  const [meeting, setMeeting] = useState<Meeting | null>(initialMeeting || null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(initialAgendaItems);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef(createClient());

  // Fetch meeting data
  const fetchMeeting = useCallback(async () => {
    const supabase = supabaseRef.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("meetings") as any)
      .select("*")
      .eq("id", meetingId)
      .eq("is_publicly_shared", true)
      .single();

    if (error) {
      console.error("Failed to fetch meeting:", error);
      return null;
    }

    return data as Meeting;
  }, [meetingId]);

  // Fetch agenda items
  const fetchAgendaItems = useCallback(async () => {
    const supabase = supabaseRef.current;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("agenda_items") as any)
      .select(`
        *,
        hymns (
          title,
          hymn_number
        )
      `)
      .eq("meeting_id", meetingId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Failed to fetch agenda items:", error);
      return null;
    }

    return data as AgendaItem[];
  }, [meetingId]);

  // Refresh all data
  const refresh = useCallback(async () => {
    const [meetingData, itemsData] = await Promise.all([
      fetchMeeting(),
      fetchAgendaItems(),
    ]);

    if (meetingData) {
      setMeeting(meetingData);
    }
    if (itemsData) {
      setAgendaItems(itemsData);
    }
    setLastUpdated(new Date());
  }, [fetchMeeting, fetchAgendaItems]);

  // Handle meeting changes from realtime
  const handleMeetingChange = useCallback(
    (payload: { eventType: string; new?: Meeting; old?: Meeting }) => {
      if (payload.eventType === "UPDATE" && payload.new) {
        setMeeting(payload.new);
        setLastUpdated(new Date());
      } else if (payload.eventType === "DELETE") {
        setMeeting(null);
      }
    },
    []
  );

  // Handle agenda item changes from realtime
  const handleAgendaChange = useCallback(
    (payload: { eventType: string; new?: AgendaItem; old?: AgendaItem }) => {
      if (payload.eventType === "INSERT" && payload.new) {
        setAgendaItems((items) => {
          const newItems = [...items, payload.new as AgendaItem];
          return newItems.sort((a, b) => a.order_index - b.order_index);
        });
        setLastUpdated(new Date());
      } else if (payload.eventType === "UPDATE" && payload.new) {
        setAgendaItems((items) =>
          items
            .map((item) =>
              item.id === payload.new?.id ? (payload.new as AgendaItem) : item
            )
            .sort((a, b) => a.order_index - b.order_index)
        );
        setLastUpdated(new Date());
      } else if (payload.eventType === "DELETE" && payload.old) {
        setAgendaItems((items) =>
          items.filter((item) => item.id !== payload.old?.id)
        );
        setLastUpdated(new Date());
      }
    },
    []
  );

  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    pollIntervalRef.current = setInterval(refresh, pollIntervalMs);
  }, [pollIntervalMs, refresh]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    if (!enabled) {
      setConnectionStatus("disconnected");
      return;
    }

    const supabase = supabaseRef.current;

    // Initial fetch
    refresh();

    // Setup realtime channel
    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${meetingId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => handleMeetingChange(payload)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agenda_items",
          filter: `meeting_id=eq.${meetingId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => handleAgendaChange(payload)
      );

    // Handle connection status
    channel.on("system", { event: "*" }, (status) => {
      if (status.extension === "presence") return;

      switch (status.event) {
        case "connected":
          setConnectionStatus("connected");
          stopPolling();
          break;
        case "disconnected":
          setConnectionStatus("disconnected");
          startPolling();
          break;
        case "error":
          setConnectionStatus("error");
          startPolling();
          break;
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnectionStatus("connected");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnectionStatus("error");
        startPolling();
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      stopPolling();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [
    meetingId,
    enabled,
    refresh,
    handleMeetingChange,
    handleAgendaChange,
    startPolling,
    stopPolling,
  ]);

  return {
    meeting,
    agendaItems,
    connectionStatus,
    lastUpdated,
    refresh,
  };
}

/**
 * Connection status indicator component helper
 */
export function getConnectionStatusColor(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "text-green-500";
    case "connecting":
      return "text-yellow-500";
    case "disconnected":
      return "text-red-500";
    case "error":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

export function getConnectionStatusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "Live";
    case "connecting":
      return "Connecting...";
    case "disconnected":
      return "Offline";
    case "error":
      return "Connection Error";
    default:
      return "Unknown";
  }
}
