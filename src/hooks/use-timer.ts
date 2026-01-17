"use client";

import { useEffect, useRef, useCallback } from "react";
import { useConductMeetingStore } from "@/stores/conduct-meeting-store";

/**
 * Hook for managing the global meeting timer tick.
 * Should be called once in the main conduct page component.
 */
export function useGlobalTimer() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { globalTimer, tickGlobalTimer } = useConductMeetingStore();

  useEffect(() => {
    if (globalTimer.status === "running") {
      intervalRef.current = setInterval(() => {
        tickGlobalTimer();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [globalTimer.status, tickGlobalTimer]);

  return globalTimer;
}

/**
 * Hook for managing a per-item timer tick.
 * @param itemId - The agenda item ID
 */
export function useItemTimer(itemId: string) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { getItemTimerState, tickItemTimer } = useConductMeetingStore();
  const timerState = getItemTimerState(itemId);

  useEffect(() => {
    if (timerState.status === "running") {
      intervalRef.current = setInterval(() => {
        tickItemTimer(itemId);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.status, itemId, tickItemTimer]);

  return timerState;
}

/**
 * Hook for timer control actions with Supabase persistence.
 */
export function useTimerControls(meetingId: string) {
  const {
    startGlobalTimer,
    pauseGlobalTimer,
    resetGlobalTimer,
    startItemTimer,
    pauseItemTimer,
    resetItemTimer,
    initItemTimer,
  } = useConductMeetingStore();

  const createTimeLog = useCallback(
    async (agendaItemId: string | null): Promise<string | null> => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("time_logs") as any)
          .insert({
            meeting_id: meetingId,
            agenda_item_id: agendaItemId,
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) {
          console.error("Failed to create time log:", error);
          return null;
        }

        return data.id;
      } catch (err) {
        console.error("Failed to create time log:", err);
        return null;
      }
    },
    [meetingId]
  );

  const updateTimeLog = useCallback(
    async (timeLogId: string, elapsedSeconds: number) => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("time_logs") as any)
          .update({
            ended_at: new Date().toISOString(),
            duration_seconds: elapsedSeconds,
          })
          .eq("id", timeLogId);
      } catch (err) {
        console.error("Failed to update time log:", err);
      }
    },
    []
  );

  // Global timer controls
  const handleStartGlobal = useCallback(() => {
    startGlobalTimer();
  }, [startGlobalTimer]);

  const handlePauseGlobal = useCallback(() => {
    pauseGlobalTimer();
  }, [pauseGlobalTimer]);

  const handleResetGlobal = useCallback(() => {
    resetGlobalTimer();
  }, [resetGlobalTimer]);

  // Item timer controls
  const handleStartItem = useCallback(
    async (itemId: string) => {
      const timeLogId = await createTimeLog(itemId);
      if (timeLogId) {
        startItemTimer(itemId, timeLogId);
      }
    },
    [createTimeLog, startItemTimer]
  );

  const handlePauseItem = useCallback(
    async (itemId: string, elapsedSeconds: number, timeLogId: string | null) => {
      pauseItemTimer(itemId);
      if (timeLogId) {
        await updateTimeLog(timeLogId, elapsedSeconds);
      }
    },
    [pauseItemTimer, updateTimeLog]
  );

  const handleResetItem = useCallback(
    (itemId: string) => {
      resetItemTimer(itemId);
    },
    [resetItemTimer]
  );

  const handleInitItem = useCallback(
    (itemId: string, allocatedMinutes: number | null) => {
      initItemTimer(itemId, allocatedMinutes);
    },
    [initItemTimer]
  );

  return {
    // Global
    handleStartGlobal,
    handlePauseGlobal,
    handleResetGlobal,
    // Item
    handleStartItem,
    handlePauseItem,
    handleResetItem,
    handleInitItem,
  };
}
