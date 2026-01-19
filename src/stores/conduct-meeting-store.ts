import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OutputData } from '@editorjs/editorjs';

export type ViewMode = 'conductor' | 'scribe';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  elapsedSeconds: number;
  lastTickAt: number | null;
  allocatedSeconds: number | null; // null = stopwatch mode
  timeLogId: string | null; // Current active time_log entry
}

export interface ConductMeetingState {
  // Meeting identification
  meetingId: string | null;

  // View mode
  viewMode: ViewMode;

  // Navigation
  activeItemId: string | null;
  activeItemIndex: number;

  // Global timer
  globalTimer: TimerState;

  // Per-item timers
  itemTimers: Record<string, TimerState>;

  // Notes (EditorJS OutputData)
  globalNotes: OutputData | null;
  itemNotes: Record<string, OutputData>;

  // Sync flags
  notesDirty: boolean;
  lastSyncedAt: number | null;

  // Actions
  setMeetingId: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveItem: (id: string, index: number) => void;

  // Global timer actions
  startGlobalTimer: () => void;
  pauseGlobalTimer: () => void;
  resetGlobalTimer: () => void;
  tickGlobalTimer: () => void;

  // Item timer actions
  initItemTimer: (itemId: string, allocatedMinutes: number | null) => void;
  startItemTimer: (itemId: string, timeLogId: string) => void;
  pauseItemTimer: (itemId: string) => void;
  resetItemTimer: (itemId: string) => void;
  tickItemTimer: (itemId: string) => void;

  // Notes actions
  setGlobalNotes: (notes: OutputData) => void;
  setItemNotes: (itemId: string, notes: OutputData) => void;
  markNotesSynced: () => void;

  // Utility
  getItemTimerState: (itemId: string) => TimerState;
  clearMeetingState: () => void;
}

const defaultTimerState: TimerState = {
  status: 'idle',
  elapsedSeconds: 0,
  lastTickAt: null,
  allocatedSeconds: null,
  timeLogId: null,
};

export const useConductMeetingStore = create<ConductMeetingState>()(
  persist(
    (set, get) => ({
      // Initial state
      meetingId: null,
      viewMode: 'conductor',
      activeItemId: null,
      activeItemIndex: 0,
      globalTimer: { ...defaultTimerState },
      itemTimers: {},
      globalNotes: null,
      itemNotes: {},
      notesDirty: false,
      lastSyncedAt: null,

      // Set meeting ID
      setMeetingId: (id) => {
        const state = get();
        // If switching to a different meeting, clear state
        if (state.meetingId && state.meetingId !== id) {
          set({
            meetingId: id,
            activeItemId: null,
            activeItemIndex: 0,
            globalTimer: { ...defaultTimerState },
            itemTimers: {},
            globalNotes: null,
            itemNotes: {},
            notesDirty: false,
            lastSyncedAt: null,
          });
        } else {
          set({ meetingId: id });
        }
      },

      // View mode
      setViewMode: (mode) => set({ viewMode: mode }),

      // Active item navigation
      setActiveItem: (id, index) => set({ activeItemId: id, activeItemIndex: index }),

      // Global timer actions
      startGlobalTimer: () => set((state) => ({
        globalTimer: {
          ...state.globalTimer,
          status: 'running',
          lastTickAt: Date.now(),
        },
      })),

      pauseGlobalTimer: () => set((state) => ({
        globalTimer: {
          ...state.globalTimer,
          status: 'paused',
          lastTickAt: null,
        },
      })),

      resetGlobalTimer: () => set({
        globalTimer: { ...defaultTimerState },
      }),

      tickGlobalTimer: () => set((state) => {
        if (state.globalTimer.status !== 'running') return state;
        return {
          globalTimer: {
            ...state.globalTimer,
            elapsedSeconds: state.globalTimer.elapsedSeconds + 1,
            lastTickAt: Date.now(),
          },
        };
      }),

      // Item timer actions
      initItemTimer: (itemId, allocatedMinutes) => set((state) => ({
        itemTimers: {
          ...state.itemTimers,
          [itemId]: {
            ...defaultTimerState,
            allocatedSeconds: allocatedMinutes ? allocatedMinutes * 60 : null,
          },
        },
      })),

      startItemTimer: (itemId, timeLogId) => set((state) => ({
        itemTimers: {
          ...state.itemTimers,
          [itemId]: {
            ...(state.itemTimers[itemId] || { ...defaultTimerState }),
            status: 'running',
            lastTickAt: Date.now(),
            timeLogId,
          },
        },
      })),

      pauseItemTimer: (itemId) => set((state) => ({
        itemTimers: {
          ...state.itemTimers,
          [itemId]: {
            ...(state.itemTimers[itemId] || { ...defaultTimerState }),
            status: 'paused',
            lastTickAt: null,
          },
        },
      })),

      resetItemTimer: (itemId) => set((state) => ({
        itemTimers: {
          ...state.itemTimers,
          [itemId]: {
            ...defaultTimerState,
            allocatedSeconds: state.itemTimers[itemId]?.allocatedSeconds || null,
          },
        },
      })),

      tickItemTimer: (itemId) => set((state) => {
        const timer = state.itemTimers[itemId];
        if (!timer || timer.status !== 'running') return state;
        return {
          itemTimers: {
            ...state.itemTimers,
            [itemId]: {
              ...timer,
              elapsedSeconds: timer.elapsedSeconds + 1,
              lastTickAt: Date.now(),
            },
          },
        };
      }),

      // Notes actions
      setGlobalNotes: (notes) => set({ globalNotes: notes, notesDirty: true }),

      setItemNotes: (itemId, notes) => set((state) => ({
        itemNotes: {
          ...state.itemNotes,
          [itemId]: notes,
        },
        notesDirty: true,
      })),

      markNotesSynced: () => set({ notesDirty: false, lastSyncedAt: Date.now() }),

      // Utility
      getItemTimerState: (itemId) => {
        const state = get();
        return state.itemTimers[itemId] || { ...defaultTimerState };
      },

      clearMeetingState: () => set({
        meetingId: null,
        activeItemId: null,
        activeItemIndex: 0,
        globalTimer: { ...defaultTimerState },
        itemTimers: {},
        globalNotes: null,
        itemNotes: {},
        notesDirty: false,
        lastSyncedAt: null,
      }),
    }),
    {
      name: 'beespo-conduct-meeting',
      partialize: (state) => ({
        meetingId: state.meetingId,
        viewMode: state.viewMode,
        activeItemId: state.activeItemId,
        activeItemIndex: state.activeItemIndex,
        globalTimer: state.globalTimer,
        itemTimers: state.itemTimers,
        globalNotes: state.globalNotes,
        itemNotes: state.itemNotes,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);

// Helper hook to get timer color based on progress
export function getTimerColor(elapsed: number, allocated: number | null): 'green' | 'yellow' | 'red' {
  if (!allocated) return 'green'; // Stopwatch mode
  const percentage = (elapsed / allocated) * 100;
  if (percentage < 80) return 'green';
  if (percentage <= 100) return 'yellow';
  return 'red';
}

// Helper to format seconds to MM:SS or HH:MM:SS
export function formatTime(seconds: number, showHours = false): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (showHours || hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Helper to get remaining time for countdown
export function getRemainingTime(elapsed: number, allocated: number): number {
  return Math.max(0, allocated - elapsed);
}
